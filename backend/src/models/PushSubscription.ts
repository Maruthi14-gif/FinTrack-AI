import mongoose, { Schema } from 'mongoose';

const pushSubscriptionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subscription: { type: Object, required: true }, // Browser PushSubscription object
  createdAt: { type: Date, default: Date.now }
});

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
export default PushSubscription;
