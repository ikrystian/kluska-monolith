import mongoose from 'mongoose';
import type { RequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { AdminApiError } from '@/lib/admin/guard';
import { getServerResource, type ServerResource } from '@/lib/admin/registry';
import { describeFields } from '@/lib/admin/schema';
import {
  ADMIN_RESOURCES,
  getAdminResource,
  relationOf,
  type AdminResource,
  type FieldMeta,
  type ReverseRelation,
} from '@/lib/admin/resources';
import { AuditLog } from '@/models/AuditLog';
import { User } from '@/models/User';

type Plain = Record<string, any>;

export interface ResolvedResource {
  config: AdminResource;
  server: ServerResource;
  fields: FieldMeta[];
}

const fieldCache = new Map<string, FieldMeta[]>();

/** Looks a resource up by its URL key; throws a 404 `AdminApiError` for an unknown one. */
export function resolveResource(key: string): ResolvedResource {
  const config = getAdminResource(key);
  const server = getServerResource(key);
  if (!config || !server) throw new AdminApiError(404, `Nieznany zasób: ${key}.`);
  let fields = fieldCache.get(key);
  if (!fields) {
    fields = describeFields(server.model, config);
    fieldCache.set(key, fields);
  }
  return { config, server, fields };
}

const getPath = (source: Plain | null | undefined, path: string): unknown =>
  path.split('.').reduce<any>((value, part) => (value == null ? undefined : value[part]), source);

function deletePath(target: Plain, path: string) {
  const parts = path.split('.');
  let node: any = target;
  for (const part of parts.slice(0, -1)) {
    node = node?.[part];
    if (node == null || typeof node !== 'object') return;
  }
  delete node[parts[parts.length - 1]];
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A stored document as the panel receives it: `id` instead of `_id`, secrets removed. */
export function serializeRecord({ config }: ResolvedResource, doc: Plain, forList = false): Plain {
  const record: Plain = JSON.parse(JSON.stringify(doc));
  record.id = String(record._id);
  delete record._id;
  delete record.__v;
  for (const path of config.secret ?? []) deletePath(record, path);
  if (config.key === 'users') delete record.password;
  if (forList) for (const path of config.heavy ?? []) deletePath(record, path);
  return record;
}

const formatDay = (value: unknown): string => {
  const date = new Date(value as string);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Warsaw' });
};

/** The human name of a record, from the first filled title field. */
export function recordLabel({ config, fields }: ResolvedResource, doc: Plain): string {
  for (const path of config.title) {
    const value = getPath(doc, path);
    if (value === undefined || value === null || value === '') continue;
    const kind = fields.find((field) => field.path === path)?.kind;
    if (kind === 'date' || value instanceof Date) return `${config.singular} ${formatDay(value)}`;
    if (kind === 'number') return `${config.singular}: ${value}`;
    const text = String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 80 ? `${text.slice(0, 79)}…` : text;
  }
  return `${config.singular} ${String(doc._id ?? doc.id ?? '').slice(-6)}`;
}

const FORBIDDEN_OPERATORS = new Set(['$where', '$function', '$accumulator', '$expr']);

function assertSafeFilter(value: unknown): void {
  if (Array.isArray(value)) return value.forEach(assertSafeFilter);
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_OPERATORS.has(key)) throw new AdminApiError(400, `Operator ${key} nie jest dozwolony.`);
      assertSafeFilter(nested);
    }
  }
}

/** Top-level fields of a resource that hold a reference to a user. */
function userFields({ config, fields }: ResolvedResource): string[] {
  return fields.filter((field) => relationOf(config, field.path)?.resource === 'users').map((field) => field.path);
}

async function searchFilter(resolved: ResolvedResource, query: string): Promise<Plain | null> {
  const text = query.trim();
  if (!text) return null;
  const { config } = resolved;
  const pattern = new RegExp(escapeRegex(text), 'i');
  const clauses: Plain[] = config.search.map((path) => ({ [path]: pattern }));
  if (mongoose.isValidObjectId(text)) clauses.push({ _id: text });

  // Searching e.g. the workout log for "Kowalski" finds that person's records.
  const peopleFields = config.key === 'users' ? [] : userFields(resolved);
  if (peopleFields.length > 0 && text.length >= 2) {
    const ids = (
      await User.find({ $or: [{ name: pattern }, { email: pattern }] }).select('_id').limit(50).lean()
    ).map((user) => String(user._id));
    if (ids.length > 0) for (const path of peopleFields) clauses.push({ [path]: { $in: ids } });
  }
  return clauses.length > 0 ? { $or: clauses } : { _id: null };
}

export interface ListParams {
  q?: string;
  filter?: Plain;
  sort?: string;
  dir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export async function listRecords(resolved: ResolvedResource, params: ListParams) {
  await connectToDatabase();
  const { config, server } = resolved;

  const clauses: Plain[] = [];
  if (params.filter && Object.keys(params.filter).length > 0) {
    assertSafeFilter(params.filter);
    clauses.push(params.filter);
  }
  const search = params.q ? await searchFilter(resolved, params.q) : null;
  if (search) clauses.push(search);
  const filter = clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { $and: clauses };

  const limit = Math.min(Math.max(Math.floor(params.limit ?? 25) || 25, 1), 200);
  const page = Math.max(Math.floor(params.page ?? 1) || 1, 1);
  const sortField = params.sort && /^[A-Za-z0-9_.]+$/.test(params.sort) ? params.sort : config.sort[0];
  const direction = params.sort ? (params.dir === 'asc' ? 1 : -1) : config.sort[1];

  let query = server.model
    .find(filter)
    .sort({ [sortField]: direction, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  const omitted = [...(config.heavy ?? []), ...(config.secret ?? []), ...(config.key === 'users' ? ['password'] : [])];
  if (omitted.length > 0) query = query.select(omitted.map((path) => `-${path}`).join(' '));

  const [docs, total] = await Promise.all([query.lean(), server.model.countDocuments(filter)]);
  return {
    data: docs.map((doc) => ({ ...serializeRecord(resolved, doc as Plain, true), _label: recordLabel(resolved, doc as Plain) })),
    total,
    page,
    limit,
  };
}

export interface LookupItem {
  /** The value stored in the referencing field. */
  value: string;
  id: string;
  label: string;
  sublabel?: string;
}

/** Names for relation pickers and relation columns: by stored values, or by a search text. */
export async function lookupRecords(
  resolved: ResolvedResource,
  options: { values?: string[]; q?: string; valueField?: string; limit?: number }
): Promise<LookupItem[]> {
  await connectToDatabase();
  const { config, server } = resolved;
  const valueField = options.valueField && options.valueField !== 'id' ? options.valueField : '_id';
  if (!/^[A-Za-z0-9_.]+$/.test(valueField)) throw new AdminApiError(400, 'Nieprawidłowe pole wartości.');

  let filter: Plain = {};
  if (options.values) {
    const values =
      valueField === '_id' ? options.values.filter((value) => mongoose.isValidObjectId(value)) : options.values;
    if (values.length === 0) return [];
    filter = { [valueField]: { $in: values.slice(0, 500) } };
  } else if (options.q?.trim()) {
    filter = (await searchFilter(resolved, options.q)) ?? {};
  }

  const select = new Set<string>([...config.title, ...(config.subtitle ? [config.subtitle] : []), valueField]);
  const docs = (await server.model
    .find(filter)
    .select(Array.from(select).join(' '))
    .sort({ [config.sort[0]]: config.sort[1] })
    .limit(options.values ? 500 : Math.min(options.limit ?? 20, 50))
    .lean()) as Plain[];

  // A record named after a person (a gamification profile, a pet's inventory) borrows that person's name.
  const titleRelation = relationOf(config, config.title[0]);
  let borrowed = new Map<string, string>();
  if (titleRelation && !titleRelation.multiple && titleRelation.resource !== config.key) {
    const target = resolveResource(titleRelation.resource);
    const targetValues = docs.map((doc) => String(getPath(doc, config.title[0]) ?? '')).filter(Boolean);
    const names = await lookupRecords(target, { values: targetValues, valueField: titleRelation.valueField });
    borrowed = new Map(names.map((item) => [item.value, item.label]));
  }

  return docs.map((doc) => {
    const own = recordLabel(resolved, doc);
    const borrowedName = titleRelation ? borrowed.get(String(getPath(doc, config.title[0]) ?? '')) : undefined;
    const sub = config.subtitle ? getPath(doc, config.subtitle) : undefined;
    return {
      value: String(getPath(doc, valueField) ?? doc._id),
      id: String(doc._id),
      label: borrowedName ? `${config.singular}: ${borrowedName}` : own,
      sublabel: typeof sub === 'string' && sub ? (sub.length > 70 ? `${sub.slice(0, 69)}…` : sub) : undefined,
    };
  });
}

export async function getRecord(resolved: ResolvedResource, id: string): Promise<Plain> {
  if (!mongoose.isValidObjectId(id)) throw new AdminApiError(400, 'Nieprawidłowy identyfikator rekordu.');
  await connectToDatabase();
  const doc = await resolved.server.model.findById(id).lean();
  if (!doc) throw new AdminApiError(404, 'Nie znaleziono rekordu.');
  return doc as Plain;
}

const SYSTEM_FIELDS = new Set(['id', '_id', '__v', '_label', 'createdAt', 'updatedAt']);

/** Keeps only fields the panel may write, as dotted path → value. */
function writableBody({ config, fields }: ResolvedResource, raw: unknown): Plain {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new AdminApiError(400, 'Nieprawidłowe dane.');
  const known = new Map(fields.map((field) => [field.path, field]));
  const body: Plain = {};
  for (const [path, value] of Object.entries(raw as Plain)) {
    if (path.startsWith('$') || path.includes('.$')) throw new AdminApiError(400, `Pole ${path} nie jest dozwolone.`);
    if (SYSTEM_FIELDS.has(path)) continue;
    const field = known.get(path);
    // Unknown paths are dropped: the schema is the list of what exists.
    if (!field || field.readOnly) continue;
    if (config.secret?.some((secret) => path === secret || path.startsWith(`${secret}.`))) continue;
    body[path] = value;
  }
  return body;
}

/** `''` and `null` mean "no value": the field is removed rather than stored empty. */
function applyFields(doc: mongoose.Document, body: Plain, fields: FieldMeta[]) {
  const kinds = new Map(fields.map((field) => [field.path, field.kind]));
  for (const [path, value] of Object.entries(body)) {
    const kind = kinds.get(path);
    const empty = value === null || value === undefined || (value === '' && kind !== 'json');
    if (empty) {
      // Lists are emptied, not removed, so readers keep getting an array.
      doc.set(path, kind === 'stringList' || kind === 'numberList' || kind === 'objectList' ? [] : undefined);
    } else {
      doc.set(path, value);
    }
  }
}

async function audit(
  admin: RequestUser,
  action: 'create' | 'update' | 'delete',
  resolved: ResolvedResource,
  doc: Plain,
  changedFields: string[] = []
) {
  if (resolved.config.key === 'auditLogs') return;
  const label = recordLabel(resolved, doc);
  const verb = action === 'create' ? 'utworzył(a)' : action === 'update' ? 'zmienił(a)' : 'usunął/usunęła';
  try {
    await AuditLog.create({
      adminId: admin.id,
      adminName: admin.name || admin.email,
      action,
      resource: resolved.config.key,
      recordId: String(doc._id),
      recordLabel: label,
      changedFields: changedFields.filter((field) => field !== 'password').concat(changedFields.includes('password') ? ['hasło'] : []),
      summary: `${admin.name || admin.email} ${verb}: ${resolved.config.singular} „${label}”`,
    });
  } catch (error) {
    // The audit trail must never block the change itself.
    console.error('Failed to write audit log:', error);
  }
}

function assertUnlocked({ config, server }: ResolvedResource) {
  if (server.locked) throw new AdminApiError(405, `${config.label}: ten zasób jest tylko do odczytu.`);
}

export async function createRecord(resolved: ResolvedResource, raw: unknown, admin: RequestUser): Promise<Plain> {
  assertUnlocked(resolved);
  if (resolved.config.canCreate === false) {
    throw new AdminApiError(405, `${resolved.config.label}: rekordy tworzy aplikacja, nie można ich dodać ręcznie.`);
  }
  await connectToDatabase();
  let body = writableBody(resolved, raw);
  if (resolved.server.prepare) body = await resolved.server.prepare({ body, existing: null, admin });

  const doc = new resolved.server.model();
  applyFields(doc, body, resolved.fields);
  await doc.save();

  const saved = doc.toObject() as Plain;
  await resolved.server.afterSave?.(saved, null, admin);
  await audit(admin, 'create', resolved, saved, Object.keys(body));
  return saved;
}

export async function updateRecord(
  resolved: ResolvedResource,
  id: string,
  raw: unknown,
  admin: RequestUser
): Promise<Plain> {
  assertUnlocked(resolved);
  if (!mongoose.isValidObjectId(id)) throw new AdminApiError(400, 'Nieprawidłowy identyfikator rekordu.');
  await connectToDatabase();

  const doc = await resolved.server.model.findById(id);
  if (!doc) throw new AdminApiError(404, 'Nie znaleziono rekordu.');
  const before = doc.toObject() as Plain;

  let body = writableBody(resolved, raw);
  if (resolved.server.prepare) body = await resolved.server.prepare({ body, existing: before, admin });
  if (Object.keys(body).length === 0) return before;

  applyFields(doc, body, resolved.fields);
  const changed = doc.modifiedPaths({ includeChildren: false });
  await doc.save();

  const saved = doc.toObject() as Plain;
  await resolved.server.afterSave?.(saved, before, admin);
  await audit(admin, 'update', resolved, saved, changed.length > 0 ? changed : Object.keys(body));
  return saved;
}

export async function deleteRecord(resolved: ResolvedResource, id: string, admin: RequestUser): Promise<void> {
  assertUnlocked(resolved);
  if (!mongoose.isValidObjectId(id)) throw new AdminApiError(400, 'Nieprawidłowy identyfikator rekordu.');
  await connectToDatabase();

  const doc = await resolved.server.model.findById(id);
  if (!doc) throw new AdminApiError(404, 'Nie znaleziono rekordu.');
  const before = doc.toObject() as Plain;

  await resolved.server.beforeDelete?.(before, admin);
  await doc.deleteOne();
  await audit(admin, 'delete', resolved, before);
}

let reverseCache: Map<string, ReverseRelation[]> | null = null;

/** Every (resource, field) that points at records of `target`, including the name-based defaults. */
export function reverseRelations(target: string): ReverseRelation[] {
  if (!reverseCache) {
    reverseCache = new Map();
    for (const config of ADMIN_RESOURCES) {
      if (!getServerResource(config.key) || config.key === 'auditLogs') continue;
      for (const field of resolveResource(config.key).fields) {
        const relation = relationOf(config, field.path);
        if (!relation) continue;
        const list = reverseCache.get(relation.resource) ?? [];
        list.push({
          resource: config.key,
          field: field.path,
          multiple: field.kind === 'stringList',
          valueField: relation.valueField ?? 'id',
        });
        reverseCache.set(relation.resource, list);
      }
    }
  }
  return reverseCache.get(target) ?? [];
}

export interface RelationCount extends ReverseRelation {
  count: number;
  /** The value to filter the referencing resource by. */
  value: string;
}

/** How many records of other collections point at this one, per referencing field. */
export async function countRelations(resolved: ResolvedResource, id: string): Promise<RelationCount[]> {
  const doc = await getRecord(resolved, id);
  const counts = await Promise.all(
    reverseRelations(resolved.config.key).map(async (relation) => {
      const value = relation.valueField === 'id' ? String(doc._id) : String(getPath(doc, relation.valueField) ?? '');
      if (!value) return null;
      const count = await resolveResource(relation.resource).server.model.countDocuments({ [relation.field]: value });
      return count > 0 ? { ...relation, count, value } : null;
    })
  );
  return counts.filter((entry): entry is RelationCount => entry !== null).sort((a, b) => b.count - a.count);
}
