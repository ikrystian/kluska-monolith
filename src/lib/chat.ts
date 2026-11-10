import { isValidObjectId } from 'mongoose';
import { Conversation, Message, User } from '@/models';
import type { RequestUser } from '@/lib/api-auth';
import { pushToUsers } from '@/lib/friends';

/**
 * Direct messages between two users.
 *
 * Conversations store denormalized `trainerName`/`athleteName` fields, but
 * which of them is "the other person" depends on who is asking and on how the
 * conversation was started — reading them by the caller's role is what made
 * users see their own name in the chat. Every view built here resolves the
 * contact from `participants` minus the caller instead, so the caller never
 * appears as their own conversation partner.
 */

export const MAX_MESSAGE_LENGTH = 4000;
const MESSAGES_PAGE = 300;

type Role = RequestUser['role'];

export interface ChatContactView {
  id: string;
  name: string;
  avatarUrl?: string;
  role: Role;
}

export interface ConversationView {
  id: string;
  conversationId: string;
  participants: string[];
  /** The other participant — never the caller. */
  contact: ChatContactView;
  lastMessage: { text: string; senderId: string; createdAt: Date } | null;
  updatedAt: Date;
  /** Messages the caller has not read yet. */
  unread: number;
  /** How many of the caller's latest messages the contact has not read yet. */
  unreadByContact: number;
}

export interface MessageView {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Date;
}

export class ChatError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** Stable key of the conversation between two users, independent of who started it. */
export function conversationKey(a: string, b: string): string {
  return [a, b].sort().join('_');
}

/** The participant who is not `userId`, or null for a broken (self/one-person) conversation. */
export function contactIdOf(conversation: { participants?: string[] }, userId: string): string | null {
  return (conversation.participants ?? []).find(id => id && id !== userId) ?? null;
}

function unreadOf(unreadCount: unknown, userId: string): number {
  if (!unreadCount) return 0;
  const value = unreadCount instanceof Map ? unreadCount.get(userId) : (unreadCount as Record<string, number>)[userId];
  return typeof value === 'number' && value > 0 ? value : 0;
}

/** Name stored on the conversation for `contactId`, matched by id (not by the caller's role). */
function storedNameOf(conversation: any, contactId: string): string | undefined {
  if (conversation.trainerId === contactId) return conversation.trainerName;
  if (conversation.athleteId === contactId) return conversation.athleteName;
  return undefined;
}

interface ContactUser {
  _id: unknown;
  name?: string;
  avatarUrl?: string;
  role?: Role;
}

async function loadContacts(ids: string[]): Promise<Map<string, ContactUser>> {
  const valid = [...new Set(ids)].filter(id => isValidObjectId(id));
  if (valid.length === 0) return new Map();
  const users = await User.find({ _id: { $in: valid } })
    .select('name avatarUrl role')
    .lean<ContactUser[]>();
  return new Map(users.map(u => [String(u._id), u]));
}

function toView(conversation: any, userId: string, contacts: Map<string, ContactUser>): ConversationView | null {
  const contactId = contactIdOf(conversation, userId);
  if (!contactId) return null;
  const user = contacts.get(contactId);
  const storedRole: Role | undefined =
    conversation.trainerId === contactId ? 'trainer' : conversation.athleteId === contactId ? 'athlete' : undefined;

  return {
    id: String(conversation._id),
    conversationId: conversation.conversationId,
    participants: conversation.participants,
    contact: {
      id: contactId,
      name: user?.name?.trim() || storedNameOf(conversation, contactId) || 'Użytkownik',
      avatarUrl: user?.avatarUrl || undefined,
      role: user?.role ?? storedRole ?? 'athlete',
    },
    lastMessage: conversation.lastMessage?.text
      ? {
          text: conversation.lastMessage.text,
          senderId: conversation.lastMessage.senderId,
          createdAt: conversation.lastMessage.createdAt,
        }
      : null,
    updatedAt: conversation.updatedAt,
    unread: unreadOf(conversation.unreadCount, userId),
    unreadByContact: unreadOf(conversation.unreadCount, contactId),
  };
}

/** The caller's conversations, newest first, each with the other participant resolved. */
export async function listConversationViews(userId: string): Promise<ConversationView[]> {
  const conversations = await Conversation.find({ participants: userId }).sort({ updatedAt: -1 }).lean();
  const contacts = await loadContacts(
    conversations.map(c => contactIdOf(c, userId)).filter((id): id is string => Boolean(id))
  );
  return conversations
    .map(c => toView(c, userId, contacts))
    .filter((view): view is ConversationView => view !== null);
}

export async function conversationView(conversation: any, userId: string): Promise<ConversationView> {
  const plain = typeof conversation.toObject === 'function' ? conversation.toObject() : conversation;
  const contactId = contactIdOf(plain, userId);
  const view = toView(plain, userId, await loadContacts(contactId ? [contactId] : []));
  if (!view) throw new ChatError(404, 'Rozmowa nie istnieje');
  return view;
}

/**
 * A conversation the caller takes part in, by document id or by its
 * `conversationId` key (older links use the key). Self-conversations left
 * over from earlier bugs count as missing.
 */
export async function findConversationFor(idOrKey: string, userId: string) {
  const byId = isValidObjectId(idOrKey) ? { _id: idOrKey } : { conversationId: idOrKey };
  const conversation = await Conversation.findOne({ ...byId, participants: userId });
  if (!conversation || !contactIdOf(conversation, userId)) {
    throw new ChatError(404, 'Rozmowa nie istnieje');
  }
  return conversation;
}

/** Finds the caller's conversation with `contactId`, creating it on first contact. Idempotent. */
export async function findOrCreateConversation(me: RequestUser, contactId: string) {
  if (!contactId || !isValidObjectId(contactId)) {
    throw new ChatError(400, 'Nieprawidłowy rozmówca');
  }
  if (contactId === me.id) {
    throw new ChatError(400, 'Nie możesz rozpocząć rozmowy z samym sobą');
  }

  const existing = await Conversation.findOne({ participants: { $all: [me.id, contactId], $size: 2 } }).sort({
    updatedAt: -1,
  });
  if (existing) return existing;

  const [self, contact] = await Promise.all([
    User.findById(me.id).select('name role').lean<ContactUser>(),
    User.findById(contactId).select('name role isGuest').lean<ContactUser & { isGuest?: boolean }>(),
  ]);
  if (!contact || contact.isGuest) {
    throw new ChatError(404, 'Nie znaleziono użytkownika');
  }

  const meEntry = { id: me.id, name: self?.name || me.name || 'Sportowiec', role: self?.role ?? me.role };
  const contactEntry = { id: contactId, name: contact.name || 'Użytkownik', role: contact.role ?? 'athlete' };
  // trainerId/athleteId follow the real roles; between two people of the same
  // role the contacted person takes the "trainer" slot (the schema needs both).
  const [trainer, athlete] =
    meEntry.role === 'trainer' && contactEntry.role !== 'trainer' ? [meEntry, contactEntry] : [contactEntry, meEntry];

  const key = conversationKey(me.id, contactId);
  try {
    return await Conversation.findOneAndUpdate(
      { conversationId: key },
      {
        $setOnInsert: {
          conversationId: key,
          participants: [me.id, contactId],
          trainerId: trainer.id,
          athleteId: athlete.id,
          trainerName: trainer.name,
          athleteName: athlete.name,
          lastMessage: null,
          unreadCount: { [me.id]: 0, [contactId]: 0 },
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
  } catch (error: any) {
    // Two "start chat" taps raced on the unique key — the other one won.
    if (error?.code === 11000) {
      const winner = await Conversation.findOne({ conversationId: key });
      if (winner) return winner;
    }
    throw error;
  }
}

export function cleanMessageText(text: unknown): string {
  const clean = typeof text === 'string' ? text.trim() : '';
  if (!clean) throw new ChatError(400, 'Wiadomość jest pusta');
  if (clean.length > MAX_MESSAGE_LENGTH) {
    throw new ChatError(400, `Wiadomość może mieć najwyżej ${MAX_MESSAGE_LENGTH} znaków`);
  }
  return clean;
}

function toMessageView(message: any): MessageView {
  return {
    id: String(message._id),
    conversationId: message.conversationId,
    senderId: message.senderId,
    text: message.text,
    createdAt: message.createdAt,
  };
}

/** The latest messages of a conversation, oldest first. */
export async function listMessages(conversationId: string): Promise<MessageView[]> {
  const latest = await Message.find({ conversationId }).sort({ createdAt: -1 }).limit(MESSAGES_PAGE).lean();
  return latest.reverse().map(toMessageView);
}

/**
 * Saves a message and updates the conversation in one atomic write: last
 * message, and +1 unread for everyone but the sender (replying also marks the
 * conversation read for the sender). Recipients get a push in the background.
 */
export async function sendMessage(conversation: any, sender: RequestUser, rawText: unknown): Promise<MessageView> {
  const text = cleanMessageText(rawText);
  const conversationId = String(conversation._id);
  const now = new Date();

  const message = await Message.create({ conversationId, senderId: sender.id, text, createdAt: now });

  const recipients = (conversation.participants as string[]).filter(id => id !== sender.id);
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: { text, senderId: sender.id, createdAt: now },
        updatedAt: now,
        [`unreadCount.${sender.id}`]: 0,
      },
      $inc: Object.fromEntries(recipients.map(id => [`unreadCount.${id}`, 1])),
    }
  );

  void pushToUsers(recipients, {
    title: sender.name || 'Nowa wiadomość',
    body: text.length > 140 ? `${text.slice(0, 139)}…` : text,
    url: `/athlete/chat?conversationId=${conversationId}`,
  }).catch(error => console.error('Chat push failed:', error));

  return toMessageView(message);
}

export async function markConversationRead(conversation: any, userId: string): Promise<void> {
  await Conversation.updateOne({ _id: conversation._id }, { $set: { [`unreadCount.${userId}`]: 0 } });
}

export async function deleteConversation(conversation: any): Promise<void> {
  const conversationId = String(conversation._id);
  await Message.deleteMany({ conversationId });
  await Conversation.deleteOne({ _id: conversation._id });
}

/** Shared guard for the chat routes: signed in with a full (non-guest) account. */
export function requireChatUser(user: RequestUser | null): RequestUser {
  if (!user) throw new ChatError(401, 'Unauthorized');
  if (user.isGuest) throw new ChatError(403, 'Czat jest dostępny po założeniu konta.');
  return user;
}
