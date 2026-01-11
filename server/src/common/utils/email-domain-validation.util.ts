import { BadRequestException } from '@nestjs/common';

/**
 * Validates email domain for workspace accounts
 * Rejects personal Gmail accounts and invalid email formats
 */
export function validateEmailDomain(email: string): void {
  if (!email) {
    throw new BadRequestException('Email is required');
  }

  const emailDomain = email.split('@')[1];

  if (!emailDomain) {
    throw new BadRequestException('Invalid email format');
  }

  if (emailDomain.toLowerCase() === 'gmail.com') {
    throw new BadRequestException(
      'Personal Gmail accounts are not supported. Please sign in with your Google Workspace account (e.g., yourname@yourcompany.com).',
    );
  }
}

