import type { CleanupDeleteResult } from './types';

export function reconcileCleanupDeleteResult(
  requestedIds: string[],
  remainingAssetIds: string[] | null,
  batchReportedSuccess: boolean,
): CleanupDeleteResult {
  if (remainingAssetIds === null) {
    return batchReportedSuccess
      ? {
          requested: requestedIds.length,
          deleted: requestedIds.length,
          failed: [],
          refreshFailed: true,
        }
      : {
          requested: requestedIds.length,
          deleted: 0,
          failed: requestedIds,
          refreshFailed: true,
        };
  }
  const remaining = new Set(remainingAssetIds);
  const failed = requestedIds.filter((id) => remaining.has(id));
  return {
    requested: requestedIds.length,
    deleted: requestedIds.length - failed.length,
    failed,
  };
}
