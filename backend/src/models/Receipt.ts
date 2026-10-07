import mongoose, { Schema } from 'mongoose';

const receiptSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  merchant: { type: String, trim: true },
  amount: { type: Number },
  date: { type: String }, // YYYY-MM-DD
  rawText: { type: String, default: '' },
  imageUrl: { type: String, required: true },
  imagePublicId: { type: String, default: null }, // set when the image lives on Cloudinary
  status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

receiptSchema.index({ userId: 1, createdAt: -1 });

export const Receipt = mongoose.model('Receipt', receiptSchema);
export default Receipt;
