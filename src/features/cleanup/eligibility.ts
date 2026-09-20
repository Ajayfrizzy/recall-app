import type { RecallActionRecord, RecallActionType } from '@/features/actions/types';
import type { RecallBundle } from '@/features/bundles/types';
import type { RecallScreenshot } from '@/features/screenshots/types';
import type { RecallItem } from '@/services/ai/types';
import type { SuggestedAction } from '@/services/understanding';
import type { CleanupReason, ScreenshotCleanupCandidate, ScreenshotHandledState } from './types';

const ITEM_ACTIONS: Record<RecallItem['type'], RecallActionType> = {
  product: 'save_product',
  place: 'save_place',
  content: 'read_later',
  deadline: 'create_reminder',
  event: 'add_to_calendar',
  general: 'keep',
};

export interface ItemHandledState {
  itemIndex: number;
  actionType: RecallActionType;
  handled: boolean;
  itemType: RecallItem['type'];
}

export function getItemHandledState(
  screenshotId: string,
  itemIndex: number,
  itemType: RecallItem['type'],
  actions: RecallActionRecord[],
): ItemHandledState {
  const actionType = ITEM_ACTIONS[itemType];
  return {
    itemIndex,
    actionType,
    itemType,
    handled: actions.some(
      (action) =>
        action.screenshotId === screenshotId &&
        action.itemIndex === itemIndex &&
        action.type === actionType &&
        action.status === 'completed',
    ),
  };
}

function itemTypeForSuggestedAction(action: SuggestedAction): RecallItem['type'] {
  const types: Record<SuggestedAction, RecallItem['type']> = {
    save_product: 'product',
    save_place: 'place',
    read_later: 'content',
    create_reminder: 'deadline',
    add_to_calendar: 'event',
    keep: 'general',
  };
  return types[action];
}

export function getScreenshotItemStates(
  screenshot: RecallScreenshot,
  actions: RecallActionRecord[],
): ItemHandledState[] {
  if (screenshot.analysis.status !== 'complete') return [];
  const semanticItems = screenshot.analysis.semantic?.items;
  if (semanticItems?.length) {
    return semanticItems.map((item, itemIndex) =>
      getItemHandledState(screenshot.id, itemIndex, item.type, actions),
    );
  }
  return [
    getItemHandledState(
      screenshot.id,
      0,
      itemTypeForSuggestedAction(screenshot.analysis.suggestedAction),
      actions,
    ),
  ];
}

export function getScreenshotHandledState(
  screenshot: RecallScreenshot,
  actions: RecallActionRecord[],
): ScreenshotHandledState {
  const items = getScreenshotItemStates(screenshot, actions);
  const handledItems = items.filter((item) => item.handled).length;
  return {
    totalItems: items.length,
    handledItems,
    allHandled: items.length > 0 && handledItems === items.length,
  };
}

function isBundled(screenshotId: string, bundles: RecallBundle[]): boolean {
  return bundles.some(
    (bundle) =>
      bundle.screenshotIds.includes(screenshotId) ||
      bundle.itemRefs.some((item) => item.screenshotId === screenshotId),
  );
}

function handledReasons(itemStates: ItemHandledState[]): CleanupReason[] {
  const handled = itemStates.filter((item) => item.handled);
  const reasons: CleanupReason[] = [];
  if (
    handled.some((item) => ['save_product', 'save_place', 'read_later'].includes(item.actionType))
  ) {
    reasons.push('saved_to_library');
  }
  if (
    handled.some((item) => !['save_product', 'save_place', 'read_later'].includes(item.actionType))
  ) {
    reasons.push('action_completed');
  }
  return reasons;
}

function reasonLabels(
  screenshot: RecallScreenshot,
  states: ItemHandledState[],
  reasons: CleanupReason[],
): string[] {
  const labels: string[] = [];
  const handled = states.filter((state) => state.handled);
  const products = states.filter((state) => state.itemType === 'product');
  const handledProducts = products.filter((state) => state.handled).length;

  if (products.length && handledProducts) {
    labels.push(
      handledProducts === products.length
        ? products.length === 1
          ? 'Product saved'
          : `All ${products.length} products saved`
        : `${handledProducts} of ${products.length} products saved`,
    );
  }
  if (handled.some((state) => state.actionType === 'save_place')) labels.push('Saved to Library');
  if (handled.some((state) => state.actionType === 'read_later'))
    labels.push('Saved to Read Later');
  if (handled.some((state) => state.actionType === 'create_reminder')) {
    labels.push('Reminder already scheduled');
  }
  if (handled.some((state) => state.actionType === 'add_to_calendar')) {
    labels.push('Added to calendar');
  }
  if (screenshot.status === 'processed') labels.push('Marked processed');
  if (screenshot.status === 'ignored') labels.push('Ignored in Recall');
  if (reasons.includes('bundled')) labels.push('Organized in a bundle');
  if (reasons.includes('manual')) labels.push('Review before deleting');
  return [...new Set(labels)];
}

export function getCleanupCandidate(
  screenshot: RecallScreenshot,
  actions: RecallActionRecord[],
  bundles: RecallBundle[] = [],
): ScreenshotCleanupCandidate | undefined {
  if (screenshot.status === 'kept') return undefined;
  const itemStates = getScreenshotItemStates(screenshot, actions);
  const handledState = getScreenshotHandledState(screenshot, actions);
  const reasons = handledReasons(itemStates);
  if (screenshot.status === 'processed') reasons.unshift('processed');
  if (screenshot.status === 'ignored') reasons.unshift('ignored');
  if (isBundled(screenshot.id, bundles)) reasons.push('bundled');

  const analysisComplete = screenshot.analysis.status === 'complete';
  const manuallyEligible = screenshot.status === 'processed' || screenshot.status === 'ignored';
  const hasDurableHandling = handledState.handledItems > 0;
  if (!manuallyEligible && !analysisComplete) return undefined;
  if (analysisComplete && !hasDurableHandling && !manuallyEligible) reasons.push('manual');

  const safe = screenshot.status === 'processed' || handledState.allHandled;
  const confidence = screenshot.status === 'ignored' ? 'review' : safe ? 'safe' : 'review';
  const uniqueReasons = [...new Set(reasons)];
  return {
    screenshotId: screenshot.id,
    reasons: uniqueReasons,
    confidence,
    suggested: confidence === 'safe',
    handledState,
    reasonLabels: reasonLabels(screenshot, itemStates, uniqueReasons),
  };
}

export function getCleanupCandidates(
  screenshots: RecallScreenshot[],
  actions: RecallActionRecord[],
  bundles: RecallBundle[] = [],
): ScreenshotCleanupCandidate[] {
  return screenshots.flatMap((screenshot) => {
    const candidate = getCleanupCandidate(screenshot, actions, bundles);
    return candidate ? [candidate] : [];
  });
}

export function selectSafeCandidateIds(candidates: ScreenshotCleanupCandidate[]): string[] {
  return candidates
    .filter((candidate) => candidate.confidence === 'safe')
    .map((candidate) => candidate.screenshotId);
}
