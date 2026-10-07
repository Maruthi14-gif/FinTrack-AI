import webpush from 'web-push';
import env from './env.js';

// Web Push needs a VAPID key pair: the public half goes to the browser when it
// subscribes, the private half signs every push we send. The pair must stay the
// same across restarts, otherwise existing browser subscriptions stop working.

let publicKey = env.vapidPublicKey;
let privateKey = env.vapidPrivateKey;

if (!publicKey || !privateKey) {
  const generated = webpush.generateVAPIDKeys();
  publicKey = generated.publicKey;
  privateKey = generated.privateKey;
  console.warn(
    env.isProduction
      ? 'VAPID keys are not set: push subscriptions will break on every restart. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.'
      : 'VAPID keys not set, using temporary keys for this run (fine for local development).'
  );
}

webpush.setVapidDetails(env.vapidSubject, publicKey, privateKey);

export const vapidPublicKey: string = publicKey;
export { webpush };
