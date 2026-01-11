import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/sequelize';
import { GmailOAuthToken } from 'src/resources/users/entities/gmail-oauth-token.entity';
import { BounceDetectionService } from 'src/common/services/bounce-detection.service';
import { TokenRefreshService } from 'src/common/services/token-refresh.service';
import { CircuitBreakerService } from 'src/common/services/circuit-breaker.service';
import { classifyGmailError, requiresTokenRefresh, requiresReAuth } from 'src/common/utils/gmail-error.util';
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
        this.logger.warn(
          `Failed to get valid access token for user ${userId}: ${err.message}`,
        );
        await this.circuitBreakerService.recordFailure(userId);
        throw error;
      }

      // Check this user's inbox for bounce emails with retry logic
      const result = await retryWithBackoff(
        () =>
          this.bounceDetectionService.checkUserInboxForBounces(
            userId,
            userEmail,
            accessToken,
            token, // Pass token for History API support
          ),
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            this.logger.debug(
              `Retrying bounce check for user ${userId} (attempt ${attempt}): ${error.message}`,
            );
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
      const err = error as Error;
      const classified = classifyGmailError(error);

      // Record failure in circuit breaker
      await this.circuitBreakerService.recordFailure(userId);

      // Handle different error types
      if (requiresReAuth(error)) {
        this.logger.warn(
          `User ${userId} needs to re-authenticate: ${err.message}`,
        );
        return { success: false, reason: 'Re-authentication required', found: 0, processed: 0 };
      } else if (requiresTokenRefresh(error)) {
        this.logger.warn(
          `Token refresh failed for user ${userId}: ${err.message}`,
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

