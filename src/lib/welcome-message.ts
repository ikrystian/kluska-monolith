import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import type { RequestUser } from '@/lib/api-auth';
import { ChatError, findOrCreateConversation, sendMessage } from '@/lib/chat';

/**
 * Welcome chat message from the administrator, one hour after registration.
 *
 * Registration stamps `welcomeMessageDueAt` on the user; a once-a-minute job
 * (started from `src/instrumentation.ts`) sends the message to everyone whose
 * time has come and whose account is active. Chat is closed to guests and to
 * accounts with an unconfirmed e-mail, so someone who activates later than an
 * hour after registering gets the message right after activation instead.
 *
 * Only accounts registered after this shipped carry the due date — existing
 * users are never messaged retroactively.
 */

export const WELCOME_MESSAGE_DELAY_MS = 60 * 60 * 1000;

const TICK_MS = 60_000;
const BATCH_SIZE = 50;
const RETRY_DELAY_MS = 15 * 60 * 1000;

/** Accounts that can already use the chat: not a guest, e-mail not pending. */
const ACTIVE_ACCOUNT = { isGuest: { $ne: true }, emailVerified: { $ne: false } };

export function buildWelcomeMessage(recipientName?: string): string {
  const firstName = recipientName?.trim().split(/\s+/)[0];
  return [
    firstName ? `Cześć ${firstName}!` : 'Cześć!',
    'Dziękuję za rejestrację w Leniwej Klusce — bardzo się cieszę, że jesteś z nami.',
    'Jestem autorem tej aplikacji. Jeśli pojawią się jakiekolwiek pytania, problemy albo sugestie — śmiało pisz do mnie tutaj, w tej rozmowie. Do każdego użytkownika podchodzimy indywidualnie, więc na każdą wiadomość odpowiem osobiście.',
    'Powodzenia na treningach!',
  ].join('\n\n');
}

/**
 * The administrator the message is sent as: the account named by
 * `WELCOME_MESSAGE_ADMIN_EMAIL`, otherwise the longest-standing admin.
 */
async function resolveWelcomeSender(): Promise<RequestUser | null> {
  const email = process.env.WELCOME_MESSAGE_ADMIN_EMAIL?.toLowerCase().trim();
  const admin = await User.findOne(email ? { role: 'admin', email } : { role: 'admin' })
    .sort({ createdAt: 1 })
    .select('name email role')
    .lean();
  if (!admin) return null;
  return { id: String(admin._id), email: admin.email, name: admin.name, role: 'admin' };
}

/** Sends the welcome message to every account that is due. Returns how many were sent. */
export async function sendDueWelcomeMessages(now: Date = new Date()): Promise<number> {
  await connectToDatabase();

  const dueFilter = { welcomeMessageDueAt: { $lte: now }, ...ACTIVE_ACCOUNT };
  const due = await User.find(dueFilter).select('_id').limit(BATCH_SIZE).lean();
  if (due.length === 0) return 0;

  const sender = await resolveWelcomeSender();
  if (!sender) {
    console.warn('Welcome message: no administrator account to send from — skipping.');
    return 0;
  }

  let sent = 0;
  for (const { _id } of due) {
    // Claim first, atomically: with several server instances (or a restart
    // mid-batch) each account is still messaged exactly once.
    const user = await User.findOneAndUpdate(
      { _id, ...dueFilter },
      { $unset: { welcomeMessageDueAt: 1 }, $set: { welcomeMessageSentAt: now } },
      { returnDocument: 'after' }
    )
      .select('name')
      .lean();
    if (!user) continue;

    try {
      const conversation = await findOrCreateConversation(sender, String(_id));
      await sendMessage(conversation, sender, buildWelcomeMessage(user.name));
      sent += 1;
    } catch (error) {
      console.error(`Welcome message to user ${String(_id)} failed:`, error);
      // A chat-level refusal (e.g. the recipient is the sender) will not fix
      // itself; anything else (database hiccup) is retried later.
      if (!(error instanceof ChatError)) {
        await User.updateOne(
          { _id },
          { $set: { welcomeMessageDueAt: new Date(Date.now() + RETRY_DELAY_MS) }, $unset: { welcomeMessageSentAt: 1 } }
        ).catch(retryError => console.error('Welcome message: could not reschedule:', retryError));
      }
    }
  }
  return sent;
}

function schedulerEnabled(): boolean {
  // Off outside production by default: a local server usually points at the
  // shared database and must not take over (or push from) the real queue.
  const flag = process.env.WELCOME_MESSAGE_SCHEDULER;
  if (flag === '1' || flag === 'true') return true;
  if (flag === '0' || flag === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

const globalState = globalThis as typeof globalThis & { __welcomeMessageTimer?: ReturnType<typeof setInterval> };

/** Starts the once-a-minute sender in this server process. Safe to call repeatedly. */
export function startWelcomeMessageScheduler(): void {
  if (globalState.__welcomeMessageTimer || !schedulerEnabled()) return;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await sendDueWelcomeMessages();
    } catch (error) {
      console.error('Welcome message job failed:', error);
    } finally {
      running = false;
    }
  };

  globalState.__welcomeMessageTimer = setInterval(tick, TICK_MS);
  // Never keep the process alive just for this timer.
  globalState.__welcomeMessageTimer.unref?.();
}
