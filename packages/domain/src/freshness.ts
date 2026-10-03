import {
  BridgeCondition,
  BridgeConditionType,
  FreshnessState,
  FreshnessStateType,
} from '@bridge/contracts';

export function calculateFreshness(
  condition: BridgeConditionType,
  reportedAt: string | Date | null,
  freshnessThresholdSeconds: number = 86400,
  now: Date = new Date()
): FreshnessStateType {
  if (condition === BridgeCondition.UNKNOWN || !reportedAt) {
    return FreshnessState.UNREPORTED;
  }

  const reportedDate = typeof reportedAt === 'string' ? new Date(reportedAt) : reportedAt;
  const elapsedSeconds = (now.getTime() - reportedDate.getTime()) / 1000;

  if (elapsedSeconds > freshnessThresholdSeconds) {
    return FreshnessState.STALE;
  }

  return FreshnessState.FRESH;
}
