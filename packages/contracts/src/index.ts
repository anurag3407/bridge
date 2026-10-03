import { z } from 'zod';

// ==========================================
// Core Enums
// ==========================================

export const BridgeCondition = {
  UNKNOWN: 'UNKNOWN',
  NORMAL: 'NORMAL',
  BROKEN: 'BROKEN',
  DANGER: 'DANGER',
} as const;

export type BridgeConditionType = (typeof BridgeCondition)[keyof typeof BridgeCondition];

export const BridgeConditionSchema = z.enum(['UNKNOWN', 'NORMAL', 'BROKEN', 'DANGER']);

export const BridgeLifecycle = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  RETIRED: 'retired',
} as const;

export type BridgeLifecycleType = (typeof BridgeLifecycle)[keyof typeof BridgeLifecycle];

export const BridgeLifecycleSchema = z.enum(['draft', 'published', 'retired']);

export const AccountStatus = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
} as const;

export type AccountStatusType = (typeof AccountStatus)[keyof typeof AccountStatus];

export const AccountStatusSchema = z.enum(['active', 'disabled']);

export const PlatformRole = {
  SUPER_ADMIN: 'super_admin',
} as const;

export type PlatformRoleType = (typeof PlatformRole)[keyof typeof PlatformRole];

export const PlatformRoleSchema = z.enum(['super_admin']);

export const FreshnessState = {
  FRESH: 'fresh',
  STALE: 'stale',
  UNREPORTED: 'unreported',
} as const;

export type FreshnessStateType = (typeof FreshnessState)[keyof typeof FreshnessState];

export const ConnectionState = {
  CONNECTING: 'connecting',
  LIVE: 'live',
  RECONNECTING: 'reconnecting',
  POLLING: 'polling',
  OFFLINE: 'offline',
} as const;

export type ConnectionStateType = (typeof ConnectionState)[keyof typeof ConnectionState];

export const AssetProcessingState = {
  AWAITING_UPLOAD: 'awaiting_upload',
  UPLOADED: 'uploaded',
  VALIDATING: 'validating',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export type AssetProcessingStateType =
  (typeof AssetProcessingState)[keyof typeof AssetProcessingState];

export const AssetProcessingStateSchema = z.enum([
  'awaiting_upload',
  'uploaded',
  'validating',
  'processing',
  'ready',
  'failed',
]);

// ==========================================
// Error Codes & API Error Shape
// ==========================================

export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE: 'UNPROCESSABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ApiErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.array(ApiErrorDetailSchema).optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// ==========================================
// 3D Viewer & Asset Schemas
// ==========================================

export const Vector3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vector3 = z.infer<typeof Vector3Schema>;

export const ViewerBoundsSchema = z.object({
  min: Vector3Schema,
  max: Vector3Schema,
  center: Vector3Schema,
  size: Vector3Schema,
});
export type ViewerBounds = z.infer<typeof ViewerBoundsSchema>;

export const CameraLimitsSchema = z.object({
  minDistance: z.number().positive(),
  maxDistance: z.number().positive(),
  defaultPosition: Vector3Schema,
  target: Vector3Schema,
});
export type CameraLimits = z.infer<typeof CameraLimitsSchema>;

export const ViewerConfigSchema = z.object({
  assetId: z.string().uuid(),
  configVersion: z.number().int().nonnegative(),
  modelToViewerTransform: z.object({
    position: Vector3Schema,
    rotation: Vector3Schema,
    scale: Vector3Schema,
  }),
  measuredBounds: ViewerBoundsSchema,
  camera: CameraLimitsSchema,
  warningAnchor: Vector3Schema,
  selectedRoadNodePaths: z.array(z.string()).optional(),
  fallbackPosterUrl: z.string().url().or(z.string().startsWith('/')),
});
export type ViewerConfig = z.infer<typeof ViewerConfigSchema>;

export const AssetManifestSchema = z.object({
  id: z.string().uuid(),
  bridgeId: z.string().uuid(),
  version: z.number().int().positive(),
  status: AssetProcessingStateSchema,
  modelUrl: z.string(),
  sha256: z.string(),
  byteCount: z.number().int().nonnegative(),
  viewerConfig: ViewerConfigSchema,
  optimizationMethod: z.enum(['baseline', 'draco', 'meshopt']).default('baseline'),
});
export type AssetManifest = z.infer<typeof AssetManifestSchema>;

// ==========================================
// Status & Report Schemas
// ==========================================

export const SubmitReportRequestSchema = z.object({
  condition: BridgeConditionSchema,
  reason: z.string().max(1000).default(''),
  publicNote: z.string().max(500).optional().nullable(),
  expectedRevision: z.string().regex(/^\d+$/, 'expectedRevision must be a decimal string'),
});
export type SubmitReportRequest = z.infer<typeof SubmitReportRequestSchema>;

export const BridgePublicStatusSchema = z.object({
  bridgeId: z.string().uuid(),
  condition: BridgeConditionSchema,
  statusRevision: z.string(),
  publicRevision: z.string(),
  reportedAt: z.string().datetime(),
  publicNote: z.string().nullable(),
  isPublished: z.boolean(),
  freshness: z.enum(['fresh', 'stale', 'unreported']),
  observedAt: z.string().datetime(),
});
export type BridgePublicStatus = z.infer<typeof BridgePublicStatusSchema>;

export const BridgeHistoryItemSchema = z.object({
  id: z.string().uuid(),
  bridgeId: z.string().uuid(),
  oldCondition: BridgeConditionSchema,
  newCondition: BridgeConditionSchema,
  oldRevision: z.string(),
  newRevision: z.string(),
  actorId: z.string().uuid(),
  actorDisplayName: z.string().optional(),
  privateReason: z.string(),
  publicNote: z.string().nullable(),
  requestId: z.string(),
  createdAt: z.string().datetime(),
});
export type BridgeHistoryItem = z.infer<typeof BridgeHistoryItemSchema>;

// ==========================================
// Bridge Management Schemas
// ==========================================

export const BridgeSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  description: z.string().nullable(),
  lifecycle: BridgeLifecycleSchema,
  locationLabel: z.string().nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  currentCondition: BridgeConditionSchema,
  reportedAt: z.string().datetime().nullable(),
  freshness: z.enum(['fresh', 'stale', 'unreported']),
  thumbnailUrl: z.string().nullable(),
});
export type BridgeSummary = z.infer<typeof BridgeSummarySchema>;

export const BridgeDetailSchema = BridgeSummarySchema.extend({
  asset: AssetManifestSchema.nullable(),
  publicNote: z.string().nullable(),
  statusRevision: z.string(),
  publicRevision: z.string(),
});
export type BridgeDetail = z.infer<typeof BridgeDetailSchema>;

export const CreateBridgeRequestSchema = z
  .object({
    slug: z
      .string()
      .min(3)
      .max(100)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lower-case alphanumeric with hyphens'),
    displayName: z.string().min(3).max(200),
    description: z.string().max(2000).optional(),
    locationLabel: z.string().max(200).optional(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
  })
  .refine(
    (data) =>
      (data.latitude === null || data.latitude === undefined) ===
      (data.longitude === null || data.longitude === undefined),
    {
      message: 'Latitude and longitude must both be provided or both be null',
      path: ['latitude'],
    }
  );
export type CreateBridgeRequest = z.infer<typeof CreateBridgeRequestSchema>;

export const UpdateBridgeRequestSchema = z
  .object({
    displayName: z.string().min(3).max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    locationLabel: z.string().max(200).optional().nullable(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    lifecycle: BridgeLifecycleSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.latitude !== undefined && data.longitude !== undefined) {
        return (data.latitude === null) === (data.longitude === null);
      }
      return true;
    },
    {
      message: 'Latitude and longitude must both be updated together or both be null',
      path: ['latitude'],
    }
  );
export type UpdateBridgeRequest = z.infer<typeof UpdateBridgeRequestSchema>;

// ==========================================
// Identity & Roles Schemas
// ==========================================

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  email: z.string().email().optional(),
  accountStatus: AccountStatusSchema,
  roles: z.array(PlatformRoleSchema),
  assignedBridgeIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const AssignOperatorRequestSchema = z.object({
  userId: z.string().uuid(),
  bridgeId: z.string().uuid(),
});
export type AssignOperatorRequest = z.infer<typeof AssignOperatorRequestSchema>;

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  requestId: z.string(),
  outcome: z.enum(['success', 'failure']),
  metadata: z.record(z.any()),
  createdAt: z.string().datetime(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;
