import { registerAs } from '@nestjs/config';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  currency: string;
}

export default registerAs('razorpay', () => ({
  keyId: process.env.RAZOR_PAY_KEY || '',
  keySecret: process.env.RAZOR_PAY_SECRET || '',
  webhookSecret: process.env.RAZOR_PAY_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || '',
  currency: process.env.RAZORPAY_CURRENCY || 'USD',
}));

