import { ErrorCode, ErrorCodeType } from '@bridge/contracts';

export class DomainError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly details?: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.BAD_REQUEST,
    statusCode: number = 400,
    details?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string = 'Resource not found') {
    super(message, ErrorCode.NOT_FOUND, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized') {
    super(message, ErrorCode.UNAUTHORIZED, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string = 'Forbidden') {
    super(message, ErrorCode.FORBIDDEN, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string = 'Concurrency or idempotency conflict') {
    super(message, ErrorCode.CONFLICT, 409);
    this.name = 'ConflictError';
  }
}

export class StaleRevisionError extends ConflictError {
  constructor(currentRevision: string, expectedRevision: string) {
    super(
      `Stale revision: server revision is ${currentRevision}, but expected revision was ${expectedRevision}`
    );
    this.name = 'StaleRevisionError';
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(message: string) {
    super(message, ErrorCode.UNPROCESSABLE, 422);
    this.name = 'InvalidTransitionError';
  }
}
