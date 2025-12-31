import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { AppError, ApiResponse } from '../../types/api.js';
import { logger } from '../../utils/logger.js';

export async function errorHandler(
  error: FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  logger.error('Request error:', {
    url: request.url,
    method: request.method,
    error: error.message,
    stack: error.stack,
  });

  if (error instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      timestamp: Date.now(),
    };

    reply.status(error.statusCode).send(response);
    return;
  }

  // Fastify validation errors
  if (error.validation) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
      },
      timestamp: Date.now(),
    };

    reply.status(400).send(response);
    return;
  }

  // Generic server error
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    timestamp: Date.now(),
  };

  reply.status(500).send(response);
}
