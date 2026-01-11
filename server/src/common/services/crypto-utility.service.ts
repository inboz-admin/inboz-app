import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoUtilityService {
  private readonly algorithm = 'sha256';
  private readonly iterations = 100000; // PBKDF2 iterations
  private readonly keyLength = 64; // 64 bytes = 512 bits
  private readonly saltLength = 32; // 32 bytes = 256 bits

  /**
   * Encrypt a plain text password using PBKDF2 with SHA-256
   * @param password - The plain text password to encrypt
   * @returns Promise<string> - The encrypted password hash with salt
   */
  async encryptPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(this.saltLength);
    const hash = crypto.pbkdf2Sync(
      password,
      salt,
      this.iterations,
      this.keyLength,
      this.algorithm,
    );

    // Combine salt and hash, then encode as base64
    const combined = Buffer.concat([salt, hash]);
    return combined.toString('base64');
  }

  /**
   * Verify a plain text password against an encrypted hash
   * @param plainPassword - The plain text password to verify
   * @param encryptedPassword - The encrypted password hash to compare against
   * @returns Promise<boolean> - True if passwords match, false otherwise
   */
  async verifyPassword(
    plainPassword: string,
    encryptedPassword: string,
  ): Promise<boolean> {
    try {
      // Decode the base64 string back to buffer
      const combined = Buffer.from(encryptedPassword, 'base64');

      // Extract salt (first 32 bytes) and hash (remaining bytes)
      const salt = combined.subarray(0, this.saltLength);
      const storedHash = combined.subarray(this.saltLength);

      // Hash the provided password with the extracted salt
      const hash = crypto.pbkdf2Sync(
        plainPassword,
        salt,
        this.iterations,
        this.keyLength,
        this.algorithm,
      );

      // Compare hashes using timing-safe comparison
      return crypto.timingSafeEqual(hash, storedHash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a random salt for password hashing
   * @param length - Length of the salt in bytes (default: 32)
   * @returns Promise<string> - The generated salt as base64
   */
  async generateSalt(length: number = this.saltLength): Promise<string> {
    const salt = crypto.randomBytes(length);
    return salt.toString('base64');
  }

  /**
   * Hash a password with a specific salt
   * @param password - The plain text password
   * @param salt - The salt to use for hashing (base64 encoded)
   * @returns Promise<string> - The hashed password with salt
   */
  async hashWithSalt(password: string, salt: string): Promise<string> {
    const saltBuffer = Buffer.from(salt, 'base64');
    const hash = crypto.pbkdf2Sync(
      password,
      saltBuffer,
      this.iterations,
      this.keyLength,
      this.algorithm,
    );

    // Combine salt and hash, then encode as base64
    const combined = Buffer.concat([saltBuffer, hash]);
    return combined.toString('base64');
  }

  /**
   * Generate a secure default password for new employees
   * @param length - Length of the password (default: 12)
   * @returns string - A randomly generated password
   */
  generateDefaultPassword(length: number = 12): string {
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one character from each category
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';

    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest with random characters
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password to randomize character positions
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Generate a random string with specified length
   * @param length - Length of the string (default: 32)
   * @returns string - A randomly generated string
   */
  generateRandomString(length: number = 32): string {
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }

    return result;
  }

  /**
   * Generate a 6-digit OTP for password reset
   * @returns string - A 6-digit numeric OTP
   */
  generateOtp(): string {
    // Generate a random 6-digit number (100000 to 999999)
    const otp = crypto.randomInt(100000, 999999);
    return otp.toString();
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   * @param text - The text to encrypt
   * @returns string - The encrypted text with IV and auth tag
   */
  async encrypt(text: string): Promise<string> {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || 'default-key-change-in-production',
      'salt',
      32,
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    cipher.setAAD(Buffer.from('additional-data', 'utf8'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex'),
    ]);
    return combined.toString('base64');
  }

  /**
   * Decrypt sensitive data using AES-256-GCM
   * @param encryptedText - The encrypted text to decrypt
   * @returns string - The decrypted text
   */
  async decrypt(encryptedText: string): Promise<string> {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || 'default-key-change-in-production',
      'salt',
      32,
    );

    const combined = Buffer.from(encryptedText, 'base64');
    const iv = combined.subarray(0, 16);
    const authTag = combined.subarray(16, 32);
    const encrypted = combined.subarray(32);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAAD(Buffer.from('additional-data', 'utf8'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
