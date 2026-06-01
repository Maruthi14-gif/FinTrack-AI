import mongoose, { Schema } from 'mongoose';

const expenseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  item: { type: String, required: true, trim: true },
  category: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
  description: { type: String, default: '' },
  receiptId: { type: Schema.Types.ObjectId, ref: 'Receipt', default: null },
  createdAt: { type: Date, default: Date.now }
});

export const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
