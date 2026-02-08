import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

interface ErrorTrackEntry {
  context: string;
  message: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

interface MetricEntry {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: Date;
}

@Injectable()
export class MonitoringService implements OnModuleInit {
  private readonly logger = new Logger(MonitoringService.name);

  // In-memory ring buffers for recent errors and metrics (for the health endpoint)
  private recentErrors: ErrorTrackEntry[] = [];
  private recentMetrics: MetricEntry[] = [];
  private readonly maxRecentErrors = 100;
  private readonly maxRecentMetrics = 1000;

  // Counters
  private errorCount = 0;
  private requestCount = 0;
  private startTime = Date.now();

  onModuleInit() {
    this.logger.log('Monitoring service initialized');

    // Setup global error handlers for truly unhandled cases
    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.trackError('unhandledRejection', error);
    });

    process.on('uncaughtException', (error) => {
      this.trackError('uncaughtException', error);
      // Note: In production, you would likely want to exit after an uncaught exception
      // process.exit(1);
    });
  }

  /**
   * Track an error event.
   */
  trackError(context: string, error: Error, metadata?: Record<string, unknown>): void {
    this.errorCount++;

    const entry: ErrorTrackEntry = {
      context,
      message: error.message,
      stack: error.stack,
      metadata,
      timestamp: new Date(),
    };

    // Keep ring buffer bounded
    this.recentErrors.push(entry);
    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors.shift();
    }

    this.logger.error(
      `[${context}] ${error.message}`,
      error.stack,
    );

    if (metadata) {
      this.logger.error(`Error metadata:`, metadata);
    }

    // If Sentry DSN is configured, you would send to Sentry here:
    // if (process.env.SENTRY_DSN) { Sentry.captureException(error, { extra: metadata }); }
  }

  /**
   * Track a numeric metric.
   */
  trackMetric(name: string, value: number, tags?: Record<string, string>): void {
    const entry: MetricEntry = {
      name,
      value,
      tags,
      timestamp: new Date(),
    };

    this.recentMetrics.push(entry);
    if (this.recentMetrics.length > this.maxRecentMetrics) {
      this.recentMetrics.shift();
    }

    this.logger.debug(`Metric: ${name}=${value}`, tags);
  }

  /**
   * Track a business event (e.g., order placed, user registered).
   */
  trackEvent(name: string, properties?: Record<string, unknown>): void {
    this.logger.log(`Event: ${name}`, properties);
  }

  /**
   * Increment request counter (called by the exception filter or middleware).
   */
  incrementRequestCount(): void {
    this.requestCount++;
  }

  /**
   * Get monitoring stats for the health endpoint.
   */
  getStats() {
    const uptimeMs = Date.now() - this.startTime;

    return {
      uptime: {
        ms: uptimeMs,
        human: this.formatUptime(uptimeMs),
      },
      counters: {
        totalErrors: this.errorCount,
        totalRequests: this.requestCount,
      },
      recentErrors: this.recentErrors.slice(-10).map((e) => ({
        context: e.context,
        message: e.message,
        timestamp: e.timestamp,
        metadata: e.metadata,
      })),
      memory: process.memoryUsage(),
    };
  }

  /**
   * Get recent errors (for admin viewing).
   */
  getRecentErrors(limit = 20): ErrorTrackEntry[] {
    return this.recentErrors.slice(-limit).reverse();
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}
