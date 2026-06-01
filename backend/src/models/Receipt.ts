import mongoose, { Schema } from 'mongoose';

const receiptSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  merchant: { type: String, trim: true },
  amount: { type: Number },
  date: { type: String }, // YYYY-MM-DD
  rawText: { type: String, default: '' },
  imageUrl: { type: String, required: true },
  status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

export const Receipt = mongoose.model('Receipt', receiptSchema);
export default Receipt;
