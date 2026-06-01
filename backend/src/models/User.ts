import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  currency: { type: String, default: 'INR' },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
export default User;
