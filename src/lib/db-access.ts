import { Conversation } from '@/models/Conversation';
import { TrainerRequest } from '@/models/TrainerRequest';
import { User } from '@/models/User';
import type { RequestUser } from '@/lib/api-auth';

/**
 * Row-level access control for the generic `/api/db/*` routes.
 *
 * Those routes take the collection, filter and update body straight from the
 * client, so every request is narrowed here to the documents the caller may
 * touch: the client's filter is AND-ed with a scope filter, ownership fields
 * on writes are checked, and fields a user must never set on themselves are
 * dropped. Admins bypass the scopes but not the operator/field sanitizing.
 */

type Filter = Record<string, any>;

export class AccessContext {
  readonly user: RequestUser | null;
  private athleteIdsPromise?: Promise<string[]>;
  private conversationIdsPromise?: Promise<string[]>;
  private contactIdsPromise?: Promise<string[]>;

  constructor(user: RequestUser | null) {
    this.user = user;
  }

  get isAdmin() {
    return this.user?.role === 'admin';
  }

  get isTrainer() {
    return this.user?.role === 'trainer';
  }

  /** Athletes assigned to the calling trainer (empty for everyone else). */
  athleteIds(): Promise<string[]> {
    if (!this.user || !this.isTrainer) return Promise.resolve([]);
    this.athleteIdsPromise ??= User.distinct('_id', { trainerId: this.user.id }).then(ids =>
      ids.map(String)
    );
    return this.athleteIdsPromise;
  }

  /** Ids the caller may act for: themselves, plus their athletes if a trainer. */
  async actorIds(): Promise<string[]> {
    if (!this.user) return [];
    return [this.user.id, ...(await this.athleteIds())];
  }

  /** `_id`s of conversations the caller takes part in. */
  conversationIds(): Promise<string[]> {
    if (!this.user) return Promise.resolve([]);
    this.conversationIdsPromise ??= Conversation.distinct('_id', { participants: this.user.id }).then(
      ids => ids.map(String)
    );
    return this.conversationIdsPromise;
  }

  /** Users the caller already has a relationship with (chats, trainer requests). */
  contactIds(): Promise<string[]> {
    if (!this.user) return Promise.resolve([]);
    const me = this.user.id;
    this.contactIdsPromise ??= Promise.all([
      Conversation.distinct('participants', { participants: me }),
      TrainerRequest.distinct('athleteId', { trainerId: me }),
      TrainerRequest.distinct('trainerId', { athleteId: me }),
    ]).then(lists => [...new Set(lists.flat().map(String))].filter(id => id !== me));
    return this.contactIdsPromise;
  }
}

interface CollectionPolicy {
  /** Readable without signing in. */
  public?: boolean;
  /** Filter of readable documents; `null` denies, `{}` allows all. */
  read(ctx: AccessContext, clientQuery: Filter): Promise<Filter | null>;
  /** Filter of documents the caller may update or delete; `null` denies. */
  write(ctx: AccessContext): Promise<Filter | null>;
  /** Whether a new (or updated) document's ownership fields are acceptable. */
  validate?(ctx: AccessContext, body: Filter, isCreate: boolean): Promise<boolean>;
  /** Fields a non-admin can never set through this API. */
  protectedFields?: string[];
}

const ALL: Filter = {};

const or = (...clauses: Filter[]): Filter => (clauses.length === 1 ? clauses[0] : { $or: clauses });

/** Fills `field` with the caller's id when missing, and requires it to be an id they act for. */
function ownsField(field: string) {
  return async (ctx: AccessContext, body: Filter, isCreate: boolean) => {
    if (isCreate && (body[field] === undefined || body[field] === null)) {
      body[field] = ctx.user!.id;
    }
    if (!(field in body)) return true;
    return (await ctx.actorIds()).includes(String(body[field]));
  };
}

/** Personal data owned via `field`; a trainer also reaches their athletes' documents. */
function owned(field: string, opts: { readAll?: boolean } = {}): CollectionPolicy {
  const scope = async (ctx: AccessContext) => ({ [field]: { $in: await ctx.actorIds() } });
  return {
    read: async ctx => (opts.readAll ? ALL : scope(ctx)),
    write: scope,
    validate: ownsField(field),
  };
}

/** Shared reference data: everyone reads, only admins write. */
const referenceData = (isPublic = false): CollectionPolicy => ({
  public: isPublic,
  read: async () => ALL,
  write: async () => null,
});

/** Drops `fields` from an update body so a document can't be handed to other users. */
function pinFields(body: Filter, fields: string[]) {
  for (const field of fields) delete body[field];
}

/** Documents linking two users through `fieldA`/`fieldB`; the caller must be one of them. */
function between(fieldA: string, fieldB: string): CollectionPolicy {
  const scope = async (ctx: AccessContext) => or({ [fieldA]: ctx.user!.id }, { [fieldB]: ctx.user!.id });
  return {
    read: scope,
    write: scope,
    validate: async (ctx, body, isCreate) => {
      if (!isCreate) {
        pinFields(body, [fieldA, fieldB]);
        return true;
      }
      return [body[fieldA], body[fieldB]].includes(ctx.user!.id);
    },
  };
}

const USER_PROTECTED_FIELDS = [
  'role',
  'password',
  'trainerId',
  'isGuest',
  'guestDeviceId',
  'stravaAccessToken',
  'stravaRefreshToken',
  'stravaTokenExpiresAt',
  'stravaAthleteId',
];

const policies: Record<string, CollectionPolicy> = {
  users: {
    read: async (ctx, clientQuery) => {
      const me = ctx.user!.id;
      const clauses: Filter[] = [
        { _id: me },
        // Trainer directory (athletes pick a trainer from it).
        { role: 'trainer' },
      ];
      const contacts = await ctx.contactIds();
      if (contacts.length) clauses.push({ _id: { $in: contacts } });
      if (ctx.isTrainer) {
        clauses.push({ trainerId: me });
        // "Add athlete" looks one athlete up by exact e-mail.
        if (typeof clientQuery.email === 'string') {
          clauses.push({ role: 'athlete', email: clientQuery.email });
        }
      }
      return or(...clauses);
    },
    write: async ctx => {
      const me = ctx.user!.id;
      return ctx.isTrainer ? or({ _id: me }, { role: 'athlete' }) : { _id: me };
    },
    protectedFields: USER_PROTECTED_FIELDS,
  },

  // Public content
  articles: {
    public: true,
    read: async () => ALL,
    write: async ctx => (ctx.isTrainer ? { authorId: ctx.user!.id } : null),
    validate: async (ctx, body, isCreate) => ctx.isTrainer && (await ownsField('authorId')(ctx, body, isCreate)),
  },
  articleCategories: referenceData(true),
  muscleGroups: referenceData(true),
  gyms: referenceData(true),
  runningPrograms: referenceData(),
  socialPosts: { public: true, ...owned('authorId', { readAll: true }) },
  socialProfiles: owned('userId', { readAll: true }),

  // Shared templates — anyone may browse, owners edit
  exercises: owned('ownerId', { readAll: true }),
  workouts: owned('ownerId', { readAll: true }),

  // Personal data
  workoutLogs: owned('athleteId'),
  goals: owned('ownerId'),
  plannedWorkouts: owned('ownerId'),
  bodyMeasurements: owned('ownerId'),
  meals: {
    ...owned('ownerId'),
    read: async ctx => or({ ownerId: { $in: await ctx.actorIds() } }, { trainerId: ctx.user!.id }),
  },
  runningSessions: owned('ownerId'),
  achievements: owned('ownerId'),
  habits: owned('ownerId'),
  habitlogs: owned('ownerId'),
  stravaActivities: owned('ownerId'),
  surveyResponses: owned('athleteId'),

  workoutPlans: {
    ...owned('trainerId'),
    read: async ctx =>
      or({ trainerId: { $in: await ctx.actorIds() } }, { assignedAthleteIds: ctx.user!.id }),
  },
  surveys: {
    ...owned('trainerId'),
    read: async ctx => or({ trainerId: ctx.user!.id }, { assignedAthleteIds: ctx.user!.id }),
  },

  // Two-party documents
  trainerRequests: between('athleteId', 'trainerId'),
  trainingSessions: between('trainerId', 'athleteId'),
  challenges: between('challengerId', 'challengedId'),
  conversations: {
    read: async ctx => ({ participants: ctx.user!.id }),
    write: async ctx => ({ participants: ctx.user!.id }),
    validate: async (ctx, body, isCreate) => {
      if (!isCreate) {
        pinFields(body, ['participants', 'trainerId', 'athleteId']);
        return true;
      }
      return Array.isArray(body.participants) && body.participants.includes(ctx.user!.id);
    },
  },
  messages: {
    read: async ctx => ({ conversationId: { $in: await ctx.conversationIds() } }),
    write: async ctx => ({ conversationId: { $in: await ctx.conversationIds() } }),
    validate: async (ctx, body, isCreate) => {
      if (!isCreate) {
        pinFields(body, ['senderId', 'conversationId']);
        return true;
      }
      body.senderId = ctx.user!.id;
      return (await ctx.conversationIds()).includes(String(body.conversationId));
    },
  },
};

const FORBIDDEN_OPERATORS = new Set(['$where', '$function', '$accumulator']);

/** Rejects server-side JavaScript operators anywhere in a client filter. */
function assertSafeFilter(value: unknown): void {
  if (Array.isArray(value)) return value.forEach(assertSafeFilter);
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_OPERATORS.has(key)) throw new AccessError(400, `Operator ${key} is not allowed`);
      assertSafeFilter(nested);
    }
  }
}

export class AccessError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function policyFor(collection: string): CollectionPolicy {
  const policy = policies[collection];
  // Collections without a policy stay admin-only.
  return policy ?? { read: async () => null, write: async () => null };
}

export function isPublicCollection(collection: string) {
  return Boolean(policies[collection]?.public);
}

const combine = (clientFilter: Filter, scope: Filter): Filter =>
  Object.keys(scope).length === 0 ? clientFilter : Object.keys(clientFilter).length === 0 ? scope : { $and: [clientFilter, scope] };

/** The filter a read must run with: the client's filter narrowed to readable documents. */
export async function scopeRead(ctx: AccessContext, collection: string, clientFilter: Filter = {}): Promise<Filter> {
  assertSafeFilter(clientFilter);
  const policy = policyFor(collection);
  if (!ctx.user) {
    if (!policy.public) throw new AccessError(401, 'Unauthorized');
    return clientFilter;
  }
  if (ctx.isAdmin) return clientFilter;
  const scope = await policy.read(ctx, clientFilter);
  if (!scope) throw new AccessError(403, 'Forbidden');
  return combine(clientFilter, scope);
}

/** The filter an update/delete must run with, narrowed to writable documents. */
export async function scopeWrite(ctx: AccessContext, collection: string, clientFilter: Filter): Promise<Filter> {
  if (!ctx.user) throw new AccessError(401, 'Unauthorized');
  if (ctx.isAdmin) return clientFilter;
  const scope = await policyFor(collection).write(ctx);
  if (!scope) throw new AccessError(403, 'Forbidden');
  return combine(clientFilter, scope);
}

/**
 * Cleans a create/update body: rejects update operators, drops protected
 * fields for non-admins and checks ownership fields. Returns the body to save.
 */
export async function sanitizeBody(
  ctx: AccessContext,
  collection: string,
  body: unknown,
  isCreate: boolean
): Promise<Filter> {
  if (!ctx.user) throw new AccessError(401, 'Unauthorized');
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AccessError(400, 'Invalid body');

  const clean: Filter = { ...(body as Filter) };
  for (const key of Object.keys(clean)) {
    if (key.startsWith('$')) throw new AccessError(400, `Operator ${key} is not allowed`);
  }

  // Passwords must go through the hashing pre-save hook, never a raw update.
  if (collection === 'users') delete clean.password;
  if (ctx.isAdmin) return clean;

  const policy = policyFor(collection);
  // Accounts are created by the auth routes (which hash the password), never here.
  if (isCreate && (collection === 'users' || (await policy.write(ctx)) === null)) {
    throw new AccessError(403, 'Forbidden');
  }

  for (const field of policy.protectedFields ?? []) {
    for (const key of Object.keys(clean)) {
      if (key === field || key.startsWith(`${field}.`)) delete clean[key];
    }
  }

  if (policy.validate && !(await policy.validate(ctx, clean, isCreate))) {
    throw new AccessError(403, 'Forbidden');
  }
  return clean;
}

/**
 * A trainer adds an athlete by setting the athlete's `trainerId` to themselves
 * and removes them by clearing it. That one field is the only thing a trainer
 * may change on another user's document.
 */
export async function trainerAssignmentUpdate(
  ctx: AccessContext,
  target: { _id: unknown; role?: string; trainerId?: string | null },
  body: Filter
): Promise<Filter | null> {
  if (!ctx.isTrainer || String(target._id) === ctx.user!.id) return null;
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'trainerId' || target.role !== 'athlete') {
    throw new AccessError(403, 'Forbidden');
  }
  const me = ctx.user!.id;
  const assigning = body.trainerId === me && (!target.trainerId || target.trainerId === me);
  const releasing = body.trainerId === null && target.trainerId === me;
  if (!assigning && !releasing) throw new AccessError(403, 'Forbidden');
  return { trainerId: body.trainerId };
}

