import {
  BridgeCondition,
  BridgeConditionType,
  BridgeLifecycle,
  BridgeLifecycleType,
} from '@bridge/contracts';
import { DomainError, InvalidTransitionError } from './errors';

export interface TransitionValidationInput {
  currentCondition: BridgeConditionType;
  newCondition: BridgeConditionType;
  reason: string;
  lifecycle: BridgeLifecycleType;
}

export function validateConditionTransition(input: TransitionValidationInput): void {
  const { currentCondition, newCondition, reason, lifecycle } = input;

  if (lifecycle === BridgeLifecycle.RETIRED) {
    throw new DomainError('Cannot report condition on a retired bridge');
  }

  // BROKEN and DANGER reports require a reason
  if (
    (newCondition === BridgeCondition.BROKEN || newCondition === BridgeCondition.DANGER) &&
    (!reason || reason.trim().length === 0)
  ) {
    throw new InvalidTransitionError(
      `Reporting ${newCondition} requires a private reason detailing the observed issue`
    );
  }

  // Resolving from BROKEN or DANGER to NORMAL requires a resolution reason
  if (
    (currentCondition === BridgeCondition.BROKEN || currentCondition === BridgeCondition.DANGER) &&
    newCondition === BridgeCondition.NORMAL &&
    (!reason || reason.trim().length === 0)
  ) {
    throw new InvalidTransitionError(
      'Restoring condition to NORMAL from BROKEN or DANGER requires a resolution explanation'
    );
  }
}
