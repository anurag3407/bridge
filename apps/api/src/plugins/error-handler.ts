import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '@bridge/domain';
import { ErrorCode, ApiError } from '@bridge/contracts';
import { ZodError } from 'zod';
import { logger } from '@bridge/observability';

export function errorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) {
  const requestId = (request.headers['x-request-id'] as string) || request.id || 'unknown';

  if (error instanceof DomainError) {
    const response: ApiError = {
      error: {
        code: error.code,
        message: error.message,
        requestId,
        details: error.details,
      },
    };
    return reply.status(error.statusCode).send(response);
  }

  if (error instanceof ZodError) {
    const details = error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    const response: ApiError = {
      error: {
        code: ErrorCode.BAD_REQUEST,
        message: 'Validation failed',
        requestId,
        details,
      },
    };
    return reply.status(400).send(response);
  }

  const fastifyErr = error as FastifyError;
  if (fastifyErr.statusCode && fastifyErr.statusCode < 500) {
    const response: ApiError = {
      error: {
        code: fastifyErr.code || ErrorCode.BAD_REQUEST,
        message: fastifyErr.message,
        requestId,
      },
    };
    return reply.status(fastifyErr.statusCode).send(response);
  }

  logger.error('Unhandled server error', {
    requestId,
    error: error.message,
    stack: error.stack,
  });

  const response: ApiError = {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
      requestId,
    },
  };
  return reply.status(500).send(response);
}
