import mongoose, { Schema } from 'mongoose';

const goalSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  deadline: { type: String, required: true }, // YYYY-MM-DD
  createdAt: { type: Date, default: Date.now }
});

export const Goal = mongoose.model('Goal', goalSchema);
export default Goal;
