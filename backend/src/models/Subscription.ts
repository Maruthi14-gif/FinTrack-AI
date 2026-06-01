import mongoose, { Schema } from 'mongoose';

const subscriptionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true, index: true },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  nextDueDate: { type: String, required: true }, // Format: YYYY-MM-DD
  status: { type: String, enum: ['active', 'paused'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
