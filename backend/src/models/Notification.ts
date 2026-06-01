import mongoose, { Schema } from 'mongoose';
import webpush from 'web-push';
import PushSubscription from './PushSubscription.js';
import dotenv from 'dotenv';

dotenv.config();

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:support@finvoice.com',
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.log('VAPID keys not configured in .env. Generating dynamic keys...');
  const keys = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  webpush.setVapidDetails(
    'mailto:support@finvoice.com',
    keys.publicKey,
    keys.privateKey
  );
}

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: { type: String, enum: ['budget_alert', 'debt_due', 'recovery_coach', 'system'], required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.post('save', async function (doc) {
  try {
    const subscriptions = await PushSubscription.find({ userId: doc.userId });
    
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title: doc.title,
      message: doc.message,
      type: doc.type,
      id: doc._id
    });

    const promises = subscriptions.map(sub => {
      return webpush.sendNotification(sub.subscription as any, payload)
        .catch(async (err: any) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`Cleaning up expired subscription for user: ${doc.userId}`);
            await PushSubscription.deleteOne({ _id: sub._id });
          } else {
            console.error('Push notification dispatch error:', err);
          }
        });
    });

    await Promise.all(promises);
  } catch (err) {
    console.error('Error executing post-save push notification hook:', err);
  }
});

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
