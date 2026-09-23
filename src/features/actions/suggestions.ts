import type { RecallActionType } from '@/features/actions/types';
import type { RecallItem } from '@/services/ai/types';

export function defaultActionTypeForItem(item: RecallItem): RecallActionType {
  const types: Record<RecallItem['type'], RecallActionType> = {
    event: 'add_to_calendar',
    deadline: 'create_reminder',
    product: 'save_product',
    place: 'save_place',
    content: 'read_later',
    general: 'keep',
  };
  return types[item.type];
}

export function suggestedActionTypeForItem(
  item: RecallItem,
  legacySuggestedActions: readonly RecallActionType[],
): RecallActionType | undefined {
  const defaultAction = defaultActionTypeForItem(item);
  if (item.suggestedAction === null) return undefined;
  if (item.suggestedAction !== undefined) {
    return item.suggestedAction === defaultAction ? defaultAction : undefined;
  }
  return legacySuggestedActions.includes(defaultAction) ? defaultAction : undefined;
}
