import mongoose, { Schema } from 'mongoose';

const debtSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  principalAmount: { type: Number, required: true },
  remainingBalance: { type: Number, required: true },
  interestRate: { type: Number, required: true }, // percentage e.g. 12.5%
  emi: { type: Number, required: true },
  dueDate: { type: String, required: true }, // YYYY-MM-DD
  createdAt: { type: Date, default: Date.now }
});

export const Debt = mongoose.model('Debt', debtSchema);
export default Debt;
