import jwt from 'jsonwebtoken';

export const TEST_JWT_SECRET = 'super-secret-jwt-token-with-minimum-32-chars-for-bridge-platform';

export const TEST_FIXTURES = {
  admin: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'admin@bridge.local',
    displayName: 'Chief Infrastructure Admin',
    role: 'super_admin',
  },
  operatorA: {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'operator-a@bridge.local',
    displayName: 'Operator Alice (Gorge Sector)',
    assignedBridgeId: '11111111-1111-1111-1111-111111111111',
  },
  operatorB: {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    email: 'operator-b@bridge.local',
    displayName: 'Operator Bob (Coastal Sector)',
    assignedBridgeId: '22222222-2222-2222-2222-222222222222',
  },
  unassigned: {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    email: 'unassigned@bridge.local',
    displayName: 'Unassigned Staff',
  },
  disabled: {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    email: 'disabled@bridge.local',
    displayName: 'Disabled Operator',
  },
  bridges: {
    bridgeA: {
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'river-gorge-bridge',
      lifecycle: 'published',
    },
    bridgeB: {
      id: '22222222-2222-2222-2222-222222222222',
      slug: 'coastal-causeway',
      lifecycle: 'published',
    },
    draftBridge: {
      id: '33333333-3333-3333-3333-333333333333',
      slug: 'mountain-pass-bridge',
      lifecycle: 'draft',
    },
    retiredBridge: {
      id: '44444444-4444-4444-4444-444444444444',
      slug: 'old-timber-crossing',
      lifecycle: 'retired',
    },
  },
};

export function generateTestToken(userId: string, email?: string): string {
  return jwt.sign(
    {
      sub: userId,
      email: email || `${userId}@example.com`,
      aud: 'authenticated',
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    TEST_JWT_SECRET
  );
}
