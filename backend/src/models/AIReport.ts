import mongoose, { Schema } from 'mongoose';

const aiReportSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['monthly_summary', 'savings_insight', 'financial_recovery_plan'], required: true },
  content: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

// Cache lookups are always "latest report of this type for this user".
aiReportSchema.index({ userId: 1, type: 1, createdAt: -1 });
// Reports are only a short-lived cache: MongoDB deletes them after 7 days.
aiReportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const AIReport = mongoose.model('AIReport', aiReportSchema);
export default AIReport;
