import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { GmailOAuthToken, GmailTokenStatus } from '../../users/entities/gmail-oauth-token.entity';
import { InjectModel } from '@nestjs/sequelize';

/**
 * RISC (Cross-Account Protection) Service
 * Handles RISC events from Google for token revocation and security incidents
 * 
 * Reference: https://developers.google.com/identity/protocols/risc
 */
@Injectable()
export class RiscService {
  private readonly logger = new Logger(RiscService.name);
  private readonly googleIssuers = [
    'https://accounts.google.com',
    'accounts.google.com',
  ];
  private googlePublicKeys: Map<string, string> = new Map();
  private keysLastFetched = 0;
  private readonly KEYS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectModel(GmailOAuthToken)
    private readonly gmailTokenModel: typeof GmailOAuthToken,
  ) {}

  /**
   * Fetch Google's public keys for JWT verification
   */
  private async fetchGooglePublicKeys(): Promise<Map<string, string>> {
    const now = Date.now();
    
    // Return cached keys if still valid
    if (this.googlePublicKeys.size > 0 && (now - this.keysLastFetched) < this.KEYS_CACHE_TTL) {
      return this.googlePublicKeys;
    }

    try {
      // Fetch Google's OAuth2 public keys
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/certs');
      const keys = response.data.keys || [];

      this.googlePublicKeys = new Map();
      for (const key of keys) {
        if (key.kid) {
          this.googlePublicKeys.set(key.kid, JSON.stringify(key));
        }
      }

      this.keysLastFetched = now;
      this.logger.log(`Fetched ${this.googlePublicKeys.size} Google public keys for RISC verification`);
      
      return this.googlePublicKeys;
    } catch (error) {
      this.logger.error(
        `Failed to fetch Google public keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('Failed to verify RISC event signature');
    }
  }

  /**
   * Verify RISC JWT token signature
   * @param token The JWT token from Google
   * @returns Decoded and verified token payload
   * 
   * Note: This is a simplified verification. For production, consider using jwks-rsa
   * or a similar library for proper JWK signature verification.
   */
  async verifyRiscToken(token: string): Promise<any> {
    try {
      // Decode JWT to get header and payload (without verification for now)
      const decoded = this.jwtService.decode(token, { complete: true }) as any;
      
      if (!decoded || !decoded.header || !decoded.payload) {
        throw new UnauthorizedException('Invalid RISC token format');
      }

      // Verify issuer
      const issuer = decoded.payload.iss;
      if (!issuer || !this.googleIssuers.some(validIssuer => issuer.includes(validIssuer))) {
        throw new UnauthorizedException(`Invalid RISC token issuer: ${issuer}`);
      }

      // Verify audience (should be your client ID or RISC endpoint URL)
      const clientId = this.configService.get('GOOGLE_CLIENT_ID');
      const audience = decoded.payload.aud;
      if (audience && audience !== clientId) {
        // Audience might be the RISC endpoint URL, which is also valid
        const riscEndpoint = this.configService.get('RISC_ENDPOINT_URL');
        if (!riscEndpoint || audience !== riscEndpoint) {
          this.logger.warn(`RISC token audience mismatch: expected ${clientId} or ${riscEndpoint}, got ${audience}`);
        }
      }

      // Verify expiration
      const now = Math.floor(Date.now() / 1000);
      if (decoded.payload.exp && decoded.payload.exp < now) {
        throw new UnauthorizedException('RISC token has expired');
      }

      // Verify issued at time (should be recent, within last hour)
      if (decoded.payload.iat) {
        const issuedAt = decoded.payload.iat;
        const oneHourAgo = now - 3600;
        if (issuedAt < oneHourAgo) {
          this.logger.warn(`RISC token issued more than 1 hour ago: ${new Date(issuedAt * 1000).toISOString()}`);
        }
      }

      // TODO: For production, implement full JWT signature verification using JWK
      // This requires:
      // 1. Fetching Google's public keys (already implemented)
      // 2. Converting JWK to PEM format
      // 3. Verifying the signature using the public key
      // Consider using libraries like: jwks-rsa, jsonwebtoken with jwk-to-pem, or jose
      
      // For now, we verify the token structure and trust HTTPS transport security
      // In production, always verify the signature
      
      this.logger.log('RISC token verified (structure only - signature verification recommended for production)');
      
      return decoded.payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `Failed to verify RISC token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('Invalid RISC token');
    }
  }

  /**
   * Process RISC event
   * @param event The RISC event payload
   */
  async processRiscEvent(event: any): Promise<void> {
    // RISC events can be in different formats:
    // 1. Single event: { sub, events: [{ event_type, ... }] }
    // 2. Multiple events: { sub, events: [{ event_type, ... }, ...] }
    
    const events = Array.isArray(event.events) ? event.events : (event.events ? [event.events] : []);
    const subject = event.sub;

    if (events.length === 0 || !subject) {
      this.logger.warn('Invalid RISC event: missing events or subject', { event });
      return;
    }

    this.logger.log(`Processing ${events.length} RISC event(s) for subject: ${subject}`);

    for (const riscEvent of events) {
      const eventType = riscEvent.event_type;
      
      if (!eventType) {
        this.logger.warn('RISC event missing event_type', { riscEvent });
        continue;
      }

      this.logger.log(`Processing RISC event: ${eventType} for subject: ${subject}`);

      switch (eventType) {
        case 'https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked':
        case 'tokens-revoked':
          await this.handleTokenRevocation(subject, riscEvent);
          break;
        
        case 'https://schemas.openid.net/secevent/oauth/event-type/account-compromised':
        case 'account-compromised':
          await this.handleAccountCompromised(subject, riscEvent);
          break;
        
        case 'https://schemas.openid.net/secevent/oauth/event-type/account-recovered':
        case 'account-recovered':
          await this.handleAccountRecovered(subject, riscEvent);
          break;
        
        default:
          this.logger.warn(`Unhandled RISC event type: ${eventType}`);
      }
    }
  }

  /**
   * Handle token revocation event
   * @param subject The subject identifier (typically Google user ID or email)
   * @param event The RISC event payload
   */
  private async handleTokenRevocation(subject: string, event: any): Promise<void> {
    try {
      // Subject can be:
      // 1. Google user ID (numeric string)
      // 2. Email address
      // 3. Account ID
      
      // Find tokens by email (subject is often the email address)
      const tokens = await this.gmailTokenModel.findAll({
        where: {
          status: GmailTokenStatus.ACTIVE,
          email: subject, // Match by email if subject is an email
        },
      });

      let revokedCount = 0;
      for (const token of tokens) {
        token.status = GmailTokenStatus.REVOKED;
        token.revokedAt = new Date();
        await token.save();
        revokedCount++;
      }

      // If no tokens found by email, try to find by user ID if subject is numeric
      if (revokedCount === 0 && /^\d+$/.test(subject)) {
        // Subject might be a Google user ID - we'd need to match via User table
        // For now, log this case for investigation
        this.logger.warn(
          `RISC token revocation for subject ${subject} - no tokens found by email. Subject may be a Google user ID.`,
        );
      }

      this.logger.log(
        `Revoked ${revokedCount} OAuth tokens due to RISC token revocation event for subject: ${subject}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle token revocation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Handle account compromised event
   */
  private async handleAccountCompromised(subject: string, event: any): Promise<void> {
    this.logger.warn(`Account compromised event received for subject: ${subject}`);
    // Revoke all tokens for this account
    await this.handleTokenRevocation(subject, event);
    // Additional actions: notify user, require re-authentication, etc.
  }

  /**
   * Handle account recovered event
   */
  private async handleAccountRecovered(subject: string, event: any): Promise<void> {
    this.logger.log(`Account recovered event received for subject: ${subject}`);
    // User has recovered their account - may want to notify them to re-authenticate
  }
}
