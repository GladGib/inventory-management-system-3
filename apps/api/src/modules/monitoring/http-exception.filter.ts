import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MonitoringService } from './monitoring.service';

/**
 * Global exception filter that integrates with the MonitoringService.
 * Replaces the existing AllExceptionsFilter to add error tracking.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly monitoring: MonitoringService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: unknown[] | Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = HttpStatus[statusCode] || 'Error';
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || exception.message;
        error = (responseObj.error as string) || HttpStatus[statusCode] || 'Error';

        // Handle class-validator validation errors (array of messages)
        if (Array.isArray(responseObj.message)) {
          details = (responseObj.message as string[]).map((msg: string) => {
            const fieldMatch = msg.match(/^(\w+)\s/);
            return {
              field: fieldMatch ? fieldMatch[1] : undefined,
              message: msg,
            };
          });
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;

      // Prisma-specific error handling
      if (exception.constructor.name === 'PrismaClientKnownRequestError') {
        const prismaError = exception as Error & { code: string; meta?: Record<string, unknown> };
        statusCode = this.mapPrismaErrorCode(prismaError.code);
        message = this.mapPrismaErrorMessage(prismaError.code, prismaError.meta);
        error = HttpStatus[statusCode] || 'Error';
      }
    }

    // Track errors via monitoring service for 5xx errors
    if (statusCode >= 500) {
      const errorObj = exception instanceof Error ? exception : new Error(String(exception));
      this.monitoring.trackError('http', errorObj, {
        url: request.url,
        method: request.method,
        statusCode,
        userId: (request as unknown as Record<string, unknown>).user
          ? ((request as unknown as Record<string, unknown>).user as Record<string, unknown>).sub
          : undefined,
        ip: request.ip,
      });

      this.logger.error(
        `${request.method} ${request.url} - ${statusCode}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${statusCode}: ${message}`,
      );
    }

    const errorResponse = {
      statusCode,
      message,
      error,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(errorResponse);
  }

  private mapPrismaErrorCode(code: string): number {
    switch (code) {
      case 'P2002':
        return HttpStatus.CONFLICT;
      case 'P2025':
        return HttpStatus.NOT_FOUND;
      case 'P2003':
        return HttpStatus.BAD_REQUEST;
      case 'P2014':
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private mapPrismaErrorMessage(code: string, meta?: Record<string, unknown>): string {
    switch (code) {
      case 'P2002': {
        const target = meta?.target;
        if (Array.isArray(target)) {
          return `A record with that ${target.join(', ')} already exists`;
        }
        return 'A record with that value already exists';
      }
      case 'P2025':
        return 'The requested record was not found';
      case 'P2003':
        return 'The operation failed due to a foreign key constraint';
      case 'P2014':
        return 'The operation failed due to a required relation';
      default:
        return 'An unexpected database error occurred';
    }
  }
}
