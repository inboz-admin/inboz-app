import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { GmailOAuthToken, GmailTokenStatus } from 'src/resources/users/entities/gmail-oauth-token.entity';
import { GmailService } from './gmail.service';
import { CryptoUtilityService } from './crypto-utility.service';

/**
 * Token Refresh Service
 * 
 * Handles automatic refresh of expired OAuth tokens for Gmail API access.
 * Extracted from email-sender.processor.ts for reuse across services.
 */
@Injectable()
export class TokenRefreshService {
  private readonly logger = new Logger(TokenRefreshService.name);
  private readonly refreshCache = new Map<string, Promise<string>>(); // Cache ongoing refresh operations

  constructor(
    @InjectModel(GmailOAuthToken)
    private readonly gmailTokenModel: typeof GmailOAuthToken,
    private readonly gmailService: GmailService,
    private readonly cryptoUtilityService: CryptoUtilityService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get a valid access token for a user, refreshing if necessary
   * 
   * @param userId User ID
   * @param forceRefresh Force refresh even if token is not expired
   * @returns Valid access token
   */
  async getValidAccessToken(
    userId: string,
    forceRefresh: boolean = false,
  ): Promise<string> {
    try {
      const token = await this.gmailTokenModel.findOne({
        where: {
          userId,
          status: GmailTokenStatus.ACTIVE,
        },
      });

      if (!token) {
        throw new Error(`No active Gmail token found for user ${userId}`);
      }

      // Decrypt current access token
      let accessToken: string;
      try {
        accessToken = await this.cryptoUtilityService.decrypt(
          token.accessTokenEncrypted,
        );
      } catch (error) {
        this.logger.warn(`Failed to decrypt token for user ${userId}, attempting refresh`);
        forceRefresh = true;
      }

      // Check if token needs refresh
      const needsRefresh =
        forceRefresh ||
        !token.tokenExpiresAt ||
        new Date(token.tokenExpiresAt) <= new Date();

      if (!needsRefresh) {
        return accessToken;
      }

      // Check if refresh token exists
      if (!token.refreshTokenEncrypted) {
        throw new Error(
          `No refresh token available for user ${userId}. User needs to re-authenticate.`,
        );
      }

      // Check cache for ongoing refresh operation
      const cacheKey = `${userId}-refresh`;
      if (this.refreshCache.has(cacheKey)) {
        this.logger.debug(`Waiting for ongoing refresh for user ${userId}`);
        return await this.refreshCache.get(cacheKey)!;
      }

      // Start refresh operation
      const refreshPromise = this.performTokenRefresh(userId, token);
      this.refreshCache.set(cacheKey, refreshPromise);

      try {
        const newAccessToken = await refreshPromise;
        return newAccessToken;
      } finally {
        // Remove from cache after completion
        this.refreshCache.delete(cacheKey);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to get valid access token for user ${userId}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(
    userId: string,
    token: GmailOAuthToken,
  ): Promise<string> {
    this.logger.log(`Refreshing token for user ${userId}...`);

    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    try {
      const refreshed = await this.gmailService.refreshAccessToken(
        token.refreshTokenEncrypted,
        clientId,
        clientSecret,
      );

      const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
      const encryptedAccessToken =
        await this.cryptoUtilityService.encrypt(refreshed.accessToken);

      await token.update({
        accessTokenEncrypted: encryptedAccessToken,
        tokenExpiresAt: expiresAt,
      });

      this.logger.log(
        `Token refreshed successfully for user ${userId}. Expires at ${expiresAt.toISOString()}`,
      );

      return refreshed.accessToken;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Token refresh failed for user ${userId}: ${err.message}`,
        err.stack,
      );

      // Mark token as invalid if refresh fails
      try {
        await token.update({ status: GmailTokenStatus.INVALID });
        this.logger.warn(
          `Marked token as INVALID for user ${userId} due to refresh failure`,
        );
      } catch (updateError) {
        this.logger.error(
          `Failed to mark token as invalid: ${(updateError as Error).message}`,
        );
      }

      throw new Error(
        `Token refresh failed for user ${userId}. User needs to re-authenticate.`,
      );
    }
  }

  /**
   * Check if a token is expired or will expire soon
   */
  async isTokenExpired(userId: string, bufferMinutes: number = 5): Promise<boolean> {
    try {
      const token = await this.gmailTokenModel.findOne({
        where: {
          userId,
          status: GmailTokenStatus.ACTIVE,
        },
      });

      if (!token || !token.tokenExpiresAt) {
        return true;
      }

      const bufferTime = bufferMinutes * 60 * 1000;
      const expiresAt = new Date(token.tokenExpiresAt);
      const now = new Date();

      return expiresAt.getTime() - now.getTime() <= bufferTime;
    } catch (error) {
      this.logger.error(
        `Error checking token expiration for user ${userId}: ${(error as Error).message}`,
      );
      return true; // Assume expired on error
    }
  }
}

