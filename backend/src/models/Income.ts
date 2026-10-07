import mongoose, { Schema } from 'mongoose';

const incomeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  source: { type: String, required: true, trim: true }, // Salary, Freelance, Business, etc.
  category: { type: String, required: true }, // Personal, Family, Education, Business, etc.
  amount: { type: Number, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

incomeSchema.index({ userId: 1, date: -1 });

export const Income = mongoose.model('Income', incomeSchema);
export default Income;
