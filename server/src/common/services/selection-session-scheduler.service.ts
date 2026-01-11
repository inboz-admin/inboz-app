import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SelectionSessionService } from 'src/resources/contacts/selection-session.service';

@Injectable()
export class SelectionSessionSchedulerService {
  private readonly logger = new Logger(SelectionSessionSchedulerService.name);

  constructor(
    private readonly selectionSessionService: SelectionSessionService,
  ) {}

  /**
   * Clean up expired selection sessions
   * Runs every 6 hours to remove sessions that have expired
   * Sessions expire after 30 minutes of inactivity
   */
  @Cron('0 */6 * * *', {
    name: 'cleanup-expired-selection-sessions',
    timeZone: 'UTC',
  })
  async handleExpiredSessionCleanup() {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      this.logger.log(
        `🧹 [SELECTION SESSION CLEANUP] Starting expired session cleanup at ${timestamp}...`,
      );

      const deletedCount =
        await this.selectionSessionService.cleanupExpiredSessions();

      const duration = Date.now() - startTime;
      const durationSeconds = (duration / 1000).toFixed(2);

      if (deletedCount > 0) {
        this.logger.log(
          `✅ [SELECTION SESSION CLEANUP] Cleaned up ${deletedCount} expired session(s) in ${durationSeconds}s`,
        );
      } else {
        this.logger.debug(
          `✅ [SELECTION SESSION CLEANUP] No expired sessions found in ${durationSeconds}s`,
        );
      }
    } catch (error) {
      const err = error as Error;
      const duration = Date.now() - startTime;
      const durationSeconds = (duration / 1000).toFixed(2);

      this.logger.error(
        `❌ [SELECTION SESSION CLEANUP] Failed after ${durationSeconds}s: ${err.message}`,
        err.stack,
      );
    }
  }
}





























