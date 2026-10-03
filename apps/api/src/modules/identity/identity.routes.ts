import { FastifyInstance } from 'fastify';
import { authenticate } from '../../plugins/jwt';
import { getPool, ProfileRepository } from '@bridge/database';
import { env } from '../../config/env';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UnauthorizedError } from '@bridge/domain';

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function identityRoutes(app: FastifyInstance) {
  const profileRepo = new ProfileRepository();

  app.get('/api/v1/me', { preHandler: [authenticate] }, async (request, reply) => {
    return request.user;
  });

  // Local/dev login endpoint to authenticate fixture users
  app.post('/api/v1/auth/login', async (request, reply) => {
    const { email } = LoginRequestSchema.parse(request.body);
    const pool = getPool();
    const client = await pool.connect();

    try {
      const res = await client.query(
        'SELECT user_id, display_name, email, account_status FROM profiles WHERE email = $1',
        [email]
      );

      if (res.rows.length === 0) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const user = res.rows[0];
      if (user.account_status === 'disabled') {
        throw new UnauthorizedError('Account has been disabled');
      }

      const token = jwt.sign(
        {
          sub: user.user_id,
          email: user.email,
          aud: 'authenticated',
          role: 'authenticated',
        },
        env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const profile = await profileRepo.findById(client, user.user_id);
      return {
        token,
        user: profile,
      };
    } finally {
      client.release();
    }
  });
}
