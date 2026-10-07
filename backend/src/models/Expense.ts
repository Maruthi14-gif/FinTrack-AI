import mongoose, { Schema } from 'mongoose';

const expenseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  item: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  description: { type: String, default: '' },
  receiptId: { type: Schema.Types.ObjectId, ref: 'Receipt', default: null },
  createdAt: { type: Date, default: Date.now }
});

// Every query starts with "this user's expenses", so the indexes do too.
// 1) a user's expenses in date order (lists, monthly totals, trends)
// 2) a user's expenses in one category by date (budget and anomaly checks)
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1, date: -1 });

export const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
