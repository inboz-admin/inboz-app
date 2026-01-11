import { Injectable, Logger } from '@nestjs/common';

export interface SchedulerExecutionMetrics {
  schedulerName: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  lastExecutionTime: Date | null;
  lastSuccessTime: Date | null;
  lastFailureTime: Date | null;
  lastError: string | null;
}

/**
 * Scheduler Health Service
 * 
 * Tracks scheduler execution metrics for monitoring and observability.
 * Provides health status and performance metrics for each scheduler.
 */
@Injectable()
export class SchedulerHealthService {
  private readonly logger = new Logger(SchedulerHealthService.name);
  private readonly metrics = new Map<string, SchedulerExecutionMetrics>();

  /**
   * Record scheduler execution start
   */
  recordStart(schedulerName: string): void {
    const metrics = this.getOrCreateMetrics(schedulerName);
    metrics.executionCount++;
    // Don't update lastExecutionTime here, wait for completion
  }

  /**
   * Record scheduler execution success
   */
  recordSuccess(
    schedulerName: string,
    duration: number,
    metadata?: Record<string, any>,
  ): void {
    const metrics = this.getOrCreateMetrics(schedulerName);
    metrics.successCount++;
    metrics.lastExecutionTime = new Date();
    metrics.lastSuccessTime = new Date();
    metrics.lastError = null;

    // Update average duration (simple moving average)
    const totalExecutions = metrics.executionCount;
    if (totalExecutions === 1) {
      metrics.averageDuration = duration;
    } else {
      metrics.averageDuration =
        (metrics.averageDuration * (totalExecutions - 1) + duration) / totalExecutions;
    }

    this.logger.debug(
      `✅ [${schedulerName}] Execution successful in ${duration.toFixed(2)}ms`,
      metadata,
    );
  }

  /**
   * Record scheduler execution failure
   */
  recordFailure(
    schedulerName: string,
    duration: number,
    error: Error | string,
    metadata?: Record<string, any>,
  ): void {
    const metrics = this.getOrCreateMetrics(schedulerName);
    metrics.failureCount++;
    metrics.lastExecutionTime = new Date();
    metrics.lastFailureTime = new Date();
    metrics.lastError = error instanceof Error ? error.message : error;

    // Update average duration
    const totalExecutions = metrics.executionCount;
    if (totalExecutions === 1) {
      metrics.averageDuration = duration;
    } else {
      metrics.averageDuration =
        (metrics.averageDuration * (totalExecutions - 1) + duration) / totalExecutions;
    }

    this.logger.warn(
      `❌ [${schedulerName}] Execution failed after ${duration.toFixed(2)}ms: ${metrics.lastError}`,
      metadata,
    );
  }

  /**
   * Get metrics for a scheduler
   */
  getMetrics(schedulerName: string): SchedulerExecutionMetrics | null {
    return this.metrics.get(schedulerName) || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, SchedulerExecutionMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get health status for a scheduler
   */
  getHealthStatus(schedulerName: string): {
    healthy: boolean;
    successRate: number;
    lastExecution: Date | null;
    message: string;
  } {
    const metrics = this.getOrCreateMetrics(schedulerName);
    const totalExecutions = metrics.executionCount;
    const successRate =
      totalExecutions > 0 ? (metrics.successCount / totalExecutions) * 100 : 100;

    // Consider unhealthy if:
    // - Success rate < 80%
    // - No successful execution in last hour (if has executions)
    const healthy =
      successRate >= 80 &&
      (metrics.lastSuccessTime === null ||
        Date.now() - metrics.lastSuccessTime.getTime() < 60 * 60 * 1000);

    let message = '';
    if (totalExecutions === 0) {
      message = 'No executions yet';
    } else if (successRate < 80) {
      message = `Low success rate: ${successRate.toFixed(1)}%`;
    } else if (
      metrics.lastSuccessTime &&
      Date.now() - metrics.lastSuccessTime.getTime() > 60 * 60 * 1000
    ) {
      message = 'No successful execution in the last hour';
    } else {
      message = 'Healthy';
    }

    return {
      healthy,
      successRate,
      lastExecution: metrics.lastExecutionTime,
      message,
    };
  }

  /**
   * Reset metrics for a scheduler
   */
  resetMetrics(schedulerName: string): void {
    this.metrics.delete(schedulerName);
    this.logger.log(`Reset metrics for scheduler: ${schedulerName}`);
  }

  /**
   * Get or create metrics for a scheduler
   */
  private getOrCreateMetrics(schedulerName: string): SchedulerExecutionMetrics {
    if (!this.metrics.has(schedulerName)) {
      this.metrics.set(schedulerName, {
        schedulerName,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        averageDuration: 0,
        lastExecutionTime: null,
        lastSuccessTime: null,
        lastFailureTime: null,
        lastError: null,
      });
    }
    return this.metrics.get(schedulerName)!;
  }
}

