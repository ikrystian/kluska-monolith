import type { Model, Schema, SchemaType } from 'mongoose';
import type { AdminResource, FieldMeta } from '@/lib/admin/resources';

type AnySchemaType = SchemaType & {
  instance: string;
  schema?: Schema;
  embeddedSchemaType?: AnySchemaType;
  enumValues?: string[];
  isRequired?: boolean;
  options?: { enum?: unknown; ref?: string };
};

const MAX_NESTING = 3;

function enumOf(type: AnySchemaType): string[] | undefined {
  const values = type.enumValues?.length ? type.enumValues : Array.isArray(type.options?.enum) ? type.options.enum : [];
  const clean = (values as unknown[]).filter((value): value is string => typeof value === 'string');
  return clean.length > 0 ? clean : undefined;
}

function isUnder(paths: string[] | undefined, path: string): boolean {
  return Boolean(paths?.some((entry) => path === entry || path.startsWith(`${entry}.`)));
}

/**
 * Describes every field of a model for the admin form: one entry per leaf path,
 * single nested documents expanded into dotted paths (`location.lat`), arrays of
 * subdocuments and free-form values left to the JSON editor.
 */
export function describeFields(model: Model<any>, resource: AdminResource): FieldMeta[] {
  const fields: FieldMeta[] = [];

  const walk = (schema: Schema, prefix: string, depth: number) => {
    for (const [name, rawType] of Object.entries(schema.paths)) {
      const type = rawType as AnySchemaType;
      const path = prefix + name;
      if (name === '_id' || name === '__v' || name.includes('$*')) continue;
      if (isUnder(resource.secret, path)) continue;

      const override = resource.fields?.[path];
      const base = {
        path,
        required: Boolean(type.isRequired),
        readOnly:
          Boolean(override?.readOnly) ||
          isUnder(resource.readOnly, path) ||
          path === 'createdAt' ||
          path === 'updatedAt',
      };

      switch (type.instance) {
        case 'String':
        case 'ObjectId':
        case 'ObjectID':
        case 'UUID':
          fields.push({ ...base, kind: 'string', enum: enumOf(type) });
          break;
        case 'Number':
        case 'Decimal128':
        case 'BigInt':
        case 'Int32':
        case 'Double':
          fields.push({ ...base, kind: 'number' });
          break;
        case 'Boolean':
          fields.push({ ...base, kind: 'boolean' });
          break;
        case 'Date':
          fields.push({ ...base, kind: 'date' });
          break;
        case 'Array': {
          if (type.schema) {
            fields.push({
              ...base,
              kind: 'objectList',
              itemFields: Object.keys(type.schema.paths).filter((key) => key !== '_id'),
            });
            break;
          }
          const item = type.embeddedSchemaType;
          if (item?.instance === 'String' || item?.instance === 'ObjectId') {
            fields.push({ ...base, kind: 'stringList', enum: item ? enumOf(item) ?? enumOf(type) : undefined });
          } else if (item?.instance === 'Number') {
            fields.push({ ...base, kind: 'numberList' });
          } else {
            fields.push({ ...base, kind: 'json' });
          }
          break;
        }
        case 'Embedded':
          // A nested document is edited field by field unless the config asks for raw JSON.
          if (type.schema && override?.widget !== 'json' && depth < MAX_NESTING) {
            walk(type.schema, `${path}.`, depth + 1);
          } else {
            fields.push({ ...base, kind: 'json' });
          }
          break;
        default:
          // Map, Mixed, Buffer…
          fields.push({ ...base, kind: 'json' });
      }
    }
  };

  walk(model.schema, '', 0);

  // The password is write-only: never returned, but settable from the form.
  if (resource.key === 'users') {
    const password = fields.find((field) => field.path === 'password');
    if (password) password.required = false;
  }
  return fields;
}
