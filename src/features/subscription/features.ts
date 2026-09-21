export const FREE_LIMITS = {
  cleanupBatchSize: 3,
  resurfacingCards: 3,
} as const;

export const PRO_LIMITS = {
  cleanupBatchSize: Number.POSITIVE_INFINITY,
  resurfacingCards: 5,
} as const;

export interface SubscriptionLimits {
  cleanupBatchSize: number;
  resurfacingCards: number;
}

export function getSubscriptionLimits(isPro: boolean): SubscriptionLimits {
  return isPro ? PRO_LIMITS : FREE_LIMITS;
}

export function canUseCleanupBatch(selectedCount: number, isPro: boolean): boolean {
  return selectedCount <= getSubscriptionLimits(isPro).cleanupBatchSize;
}
