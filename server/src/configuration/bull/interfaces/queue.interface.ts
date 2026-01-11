import { JobType, JobPriority } from '../enums/queue.enum';

export interface JobData {
  [key: string]: any;
}

export interface JobOptions {
  priority?: JobPriority;
  delay?: number; // milliseconds
  attempts?: number;
  backoff?: number | { type: 'exponential' | 'fixed'; delay: number };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  timeout?: number;
  repeat?: {
    cron?: string;
    every?: number;
    limit?: number;
  };
}

export interface JobResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    processedAt?: Date;
    duration?: number;
    attemptNumber?: number;
    [key: string]: any;
  };
}

export interface QueueConfig {
  name: string;
  defaultJobOptions?: JobOptions;
  limiter?: {
    max: number; // Max number of jobs processed
    duration: number; // per duration in milliseconds
  };
  settings?: {
    stalledInterval?: number;
    maxStalledCount?: number;
  };
}

export interface BulkJobData {
  name: string;
  data: JobData;
  opts?: JobOptions;
}

export interface JobProgress {
  percentage: number;
  message?: string;
  data?: any;
}
