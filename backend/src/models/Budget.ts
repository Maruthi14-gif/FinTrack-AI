import mongoose, { Schema } from 'mongoose';

const budgetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, required: true, index: true },
  monthly_limit: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Ensure a user can only have one budget per category
budgetSchema.index({ userId: 1, category: 1 }, { unique: true });

export const Budget = mongoose.model('Budget', budgetSchema);
export default Budget;
