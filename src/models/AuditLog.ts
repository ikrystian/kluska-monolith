import mongoose, { Schema, Model, Document } from 'mongoose';

/** One change made through the admin panel: who, what, and which fields. */
export interface IAuditLog extends Document {
  adminId: string;
  adminName: string;
  action: 'create' | 'update' | 'delete';
  /** Key of the admin resource (lib/admin/resources). */
  resource: string;
  recordId: string;
  recordLabel?: string;
  changedFields: string[];
  summary: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    adminId: { type: String, required: true, index: true },
    adminName: { type: String, default: '' },
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    resource: { type: String, required: true },
    recordId: { type: String, required: true },
    recordLabel: { type: String },
    changedFields: { type: [String], default: [] },
    summary: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ resource: 1, recordId: 1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
