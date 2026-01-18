import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/sequelize';
import { GmailOAuthToken } from 'src/resources/users/entities/gmail-oauth-token.entity';
import { BounceDetectionService } from 'src/common/services/bounce-detection.service';
import { TokenRefreshService } from 'src/common/services/token-refresh.service';
import { CircuitBreakerService } from 'src/common/services/circuit-breaker.service';
import { classifyGmailError, requiresTokenRefresh, requiresReAuth, isRefreshTokenError } from 'src/common/utils/gmail-error.util';
import { retryWithBackoff } from 'src/common/utils/retry.util';
import { QueueName } from '../enums/queue.enum';

/**
 * BullMQ Processor for Bounce Detection
 * Processes individual account bounce detection jobs
 */
@Processor(QueueName.BOUNCE_DETECTION)
export class BounceDetectionProcessor extends WorkerHost {
  private readonly logger = new Logger(BounceDetectionProcessor.name);

  constructor(
    @InjectModel(GmailOAuthToken)
    private readonly gmailTokenModel: typeof GmailOAuthToken,
    private readonly bounceDetectionService: BounceDetectionService,
    private readonly tokenRefreshService: TokenRefreshService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {
    super();
    this.logger.log('BounceDetectionProcessor initialized');
  }

  async process(job: Job): Promise<any> {
    const { userId, userEmail, lastHistoryId } = job.data;

    this.logger.debug(`🔍 Processing bounce detection job ${job.id} for user ${userEmail}`);

    try {
      // Check circuit breaker before processing
      if (await this.circuitBreakerService.isOpen(userId)) {
        this.logger.debug(
          `Circuit breaker is OPEN for user ${userId}, skipping bounce detection`,
        );
        return { success: false, reason: 'Circuit breaker is open', found: 0, processed: 0 };
      }

      // Get Gmail token
      const token = await this.gmailTokenModel.findOne({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      if (!token) {
        this.logger.warn(`No active Gmail token found for user ${userId}`);
        return { success: false, reason: 'No active token', found: 0, processed: 0 };
      }

      // Get valid access token (refresh if needed)
      let accessToken: string;
      try {
        accessToken = await this.tokenRefreshService.getValidAccessToken(
          userId,
        );
      } catch (error) {
        const err = error as Error;
        
        // Check if refresh token itself is invalid (user must re-authenticate)
        if (isRefreshTokenError(error)) {
          this.logger.error(
            `Refresh token is invalid for user ${userId} (${userEmail}). User must re-authenticate: ${err.message}`,
          );
          await this.circuitBreakerService.recordFailure(userId);
          return { 
            success: false, 
            reason: 'Refresh token invalid - re-authentication required', 
            found: 0, 
            processed: 0 
          };
        }
        
        this.logger.warn(
          `Failed to get valid access token for user ${userId}: ${err.message}`,
        );
        await this.circuitBreakerService.recordFailure(userId);
        throw error;
      }

      // Check this user's inbox for bounce emails with retry logic
      // Get token once and only refresh if auth error occurs
      let currentAccessToken = accessToken;
      let tokenRefreshed = false;
      
      try {
        const result = await retryWithBackoff(
          async () => {
            // Use current token (will be refreshed if auth error occurred)
            return await this.bounceDetectionService.checkUserInboxForBounces(
              userId,
              userEmail,
              currentAccessToken,
              token, // Pass token for History API support
            );
          },
          {
            maxAttempts: 3,
            onRetry: async (attempt, error) => {
              this.logger.debug(
                `Retrying bounce check for user ${userId} (attempt ${attempt}): ${error.message}`,
              );
              
              // If auth error, refresh token before retry (only once)
              if (requiresTokenRefresh(error) && !tokenRefreshed) {
                // Check if refresh token itself is invalid - don't retry if so
                if (isRefreshTokenError(error)) {
                  this.logger.error(
                    `Refresh token is invalid for user ${userId}. Stopping retries - user must re-authenticate.`,
                  );
                  // Re-throw to stop retries
                  throw error;
                }
                
                this.logger.log(
                  `Auth error detected, refreshing token for user ${userId} before retry`,
                );
                try {
                  currentAccessToken = await this.tokenRefreshService.getValidAccessToken(
                    userId,
                    true, // Force refresh
                  );
                  tokenRefreshed = true;
                  this.logger.log(`Token refreshed successfully for user ${userId}`);
                } catch (refreshError) {
                  const refreshErr = refreshError as Error;
                  
                  // Check if refresh token is invalid
                  if (isRefreshTokenError(refreshError)) {
                    this.logger.error(
                      `Refresh token is invalid for user ${userId}. Stopping retries - user must re-authenticate: ${refreshErr.message}`,
                    );
                    // Re-throw to stop retries
                    throw refreshError;
                  }
                  
                  this.logger.warn(
                    `Token refresh failed for user ${userId}: ${refreshErr.message}`,
                  );
                  // Continue with retry anyway - might work if token was just expired
                }
              }
            },
          },
          this.logger,
        );
        
        // Record success if we got a result
        if (result) {
          await this.circuitBreakerService.recordSuccess(userId);
        }

        this.logger.log(
          `✅ Bounce detection completed for user ${userEmail}: found ${result.found}, processed ${result.processed}`,
        );

        return {
          success: true,
          found: result.found,
          processed: result.processed,
        };
      } catch (error) {
        // Check if refresh token is invalid - don't retry if so
        if (isRefreshTokenError(error)) {
          this.logger.error(
            `Refresh token is invalid for user ${userId} (${userEmail}). User must re-authenticate. Stopping all retries.`,
          );
          await this.circuitBreakerService.recordFailure(userId);
          return { 
            success: false, 
            reason: 'Refresh token invalid - re-authentication required', 
            found: 0, 
            processed: 0 
          };
        }
        
        // If auth error after all retries, try one more time with forced refresh
        if (requiresTokenRefresh(error) && !tokenRefreshed) {
          this.logger.log(
            `Auth error after retries, attempting token refresh for user ${userId}`,
          );
          try {
            // Force refresh token
            currentAccessToken = await this.tokenRefreshService.getValidAccessToken(
              userId,
              true, // Force refresh
            );
            
            // Try one more time with refreshed token
            const result = await this.bounceDetectionService.checkUserInboxForBounces(
              userId,
              userEmail,
              currentAccessToken,
              token, // Pass token for History API support
            );
            
            await this.circuitBreakerService.recordSuccess(userId);
            this.logger.log(
              `Successfully processed bounce check after token refresh for user ${userId}`,
            );
            
            return {
              success: true,
              found: result.found,
              processed: result.processed,
            };
          } catch (refreshError) {
            const refreshErr = refreshError as Error;
            
            // Check if refresh token is invalid
            if (isRefreshTokenError(refreshError)) {
              this.logger.error(
                `Refresh token is invalid for user ${userId} (${userEmail}). User must re-authenticate: ${refreshErr.message}`,
              );
              await this.circuitBreakerService.recordFailure(userId);
              return { 
                success: false, 
                reason: 'Refresh token invalid - re-authentication required', 
                found: 0, 
                processed: 0 
              };
            }
            
            this.logger.error(
              `Failed to refresh token or retry for user ${userId}: ${refreshErr.message}`,
            );
            await this.circuitBreakerService.recordFailure(userId);
            throw refreshError;
          }
        }
        
        // Re-throw if not auth error or already tried refresh
        await this.circuitBreakerService.recordFailure(userId);
        throw error;
      }
    } catch (error) {
      const err = error as Error;
      const classified = classifyGmailError(error);

      // Record failure in circuit breaker
      await this.circuitBreakerService.recordFailure(userId);

      // Handle different error types
      if (isRefreshTokenError(error)) {
        this.logger.error(
          `Refresh token is invalid for user ${userId} (${userEmail}). User must re-authenticate: ${err.message}`,
        );
        return { 
          success: false, 
          reason: 'Refresh token invalid - re-authentication required', 
          found: 0, 
          processed: 0 
        };
      } else if (requiresReAuth(error)) {
        this.logger.warn(
          `User ${userId} (${userEmail}) needs to re-authenticate: ${err.message}`,
        );
        return { success: false, reason: 'Re-authentication required', found: 0, processed: 0 };
      } else if (requiresTokenRefresh(error)) {
        this.logger.warn(
          `Token refresh failed for user ${userId} (${userEmail}): ${err.message}`,
        );
        return { success: false, reason: 'Token refresh failed', found: 0, processed: 0 };
      }

      this.logger.error(
        `Error processing bounce detection for user ${userId}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }
}

