import mongoose, { Schema } from 'mongoose';

const aiReportSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['monthly_summary', 'savings_insight', 'financial_recovery_plan'], required: true },
  content: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

export const AIReport = mongoose.model('AIReport', aiReportSchema);
export default AIReport;
