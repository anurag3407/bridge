import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getPool, ProfileRepository, AssignmentRepository } from '@bridge/database';
import { UnauthorizedError, ForbiddenError } from '@bridge/domain';
import { UserProfile } from '@bridge/contracts';

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserProfile;
  }
}

const profileRepo = new ProfileRepository();
const assignmentRepo = new AssignmentRepository();

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = authHeader.substring(7).trim();
  let decoded: any;

  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired authentication token');
  }

  const userId = decoded.sub || decoded.userId || decoded.id;
  if (!userId) {
    throw new UnauthorizedError('Token does not contain a valid user identity');
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    const profile = await profileRepo.findById(client, userId);
    if (!profile) {
      throw new UnauthorizedError('User profile not found');
    }

    if (profile.accountStatus === 'disabled') {
      throw new ForbiddenError('Account has been disabled');
    }

    request.user = profile;
  } finally {
    client.release();
  }
}

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (!request.user?.roles.includes('super_admin')) {
    throw new ForbiddenError('Operation requires super admin privilege');
  }
}

export function requireAssignedOperator(bridgeIdParamKey: string = 'bridgeId') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    const user = request.user!;
    if (user.roles.includes('super_admin')) {
      return; // super admin can manage any bridge
    }

    const bridgeId = (request.params as any)[bridgeIdParamKey];
    if (!bridgeId) {
      throw new ForbiddenError('Missing bridge identifier');
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
      const isAssigned = await assignmentRepo.isOperatorAssigned(client, bridgeId, user.id);
      if (!isAssigned) {
        throw new ForbiddenError('You are not an assigned operator for this bridge');
      }
    } finally {
      client.release();
    }
  };
}
