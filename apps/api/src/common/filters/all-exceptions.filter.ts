import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter that normalizes all error responses to a consistent format:
 *
 * {
 *   "statusCode": 400,
 *   "message": "Validation failed",
 *   "error": "Bad Request",
 *   "details": [...],
 *   "timestamp": "2026-02-08T12:00:00.000Z"
 * }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

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
            // Attempt to extract field name from validation message
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

    // Log the error
    if (statusCode >= 500) {
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
      case 'P2002': // Unique constraint violation
        return HttpStatus.CONFLICT;
      case 'P2025': // Record not found
        return HttpStatus.NOT_FOUND;
      case 'P2003': // Foreign key constraint violation
        return HttpStatus.BAD_REQUEST;
      case 'P2014': // Required relation violation
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
