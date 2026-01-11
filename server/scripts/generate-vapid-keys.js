/**
 * Generate VAPID keys for push notifications
 * Run: node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');

console.log('🔑 Generating VAPID keys for push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('Add these to your .env file:\n');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('VAPID_SUBJECT=mailto:admin@inboz.com\n');
console.log('Also add the public key to your frontend .env file:\n');
console.log('VITE_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey + '\n');

