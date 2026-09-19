import type { RecallActionRecord, RecallActionType } from '@/features/actions/types';
import type { LibraryItem } from '@/features/library/types';
import type { ScreenshotStatus } from '@/features/screenshots/types';
import type { UpcomingItem } from '@/features/upcoming/types';
import { isRecallAnalysis } from '@/services/ai/validation';
import type {
  ScreenshotAnalysis,
  ScreenshotCategory,
  SuggestedAction,
} from '@/services/understanding';
import {
  ANALYSIS_VERSION,
  createEmptyPersistedState,
  PERSISTED_STATE_VERSION,
  type PersistedRecallStateV1,
  type PersistedScreenshotState,
} from './types';

const MAX_OCR_TEXT_LENGTH = 100_000;
const SCREENSHOT_STATUSES = new Set<ScreenshotStatus>(['pending', 'kept', 'ignored', 'processed']);
const CATEGORIES = new Set<ScreenshotCategory>([
  'event',
  'deadline',
  'product',
  'place',
  'content',
  'general',
]);
const ACTIONS = new Set<SuggestedAction>([
  'add_to_calendar',
  'create_reminder',
  'save_product',
  'save_place',
  'read_later',
  'keep',
]);
const ACTION_TYPES = new Set<RecallActionType>(ACTIONS);
const LIBRARY_TYPES = new Set<LibraryItem['type']>(['product', 'place', 'content']);
const UPCOMING_TYPES = new Set<UpcomingItem['type']>(['event', 'deadline']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isTimestamp(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isValidId(value: unknown): value is string {
  return isString(value) && value.trim().length > 0 && value.length <= 500;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function validateAnalysis(value: unknown): ScreenshotAnalysis | undefined {
  if (
    !isRecord(value) ||
    value.status !== 'complete' ||
    value.analysisVersion !== ANALYSIS_VERSION
  ) {
    return undefined;
  }
  if (
    !isString(value.extractedText) ||
    !isString(value.category) ||
    !CATEGORIES.has(value.category as ScreenshotCategory) ||
    !isFiniteNumber(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1 ||
    !isString(value.summary) ||
    !isString(value.suggestedAction) ||
    !ACTIONS.has(value.suggestedAction as SuggestedAction) ||
    !isRecord(value.metadata) ||
    (value.missingDetails !== undefined && !isStringArray(value.missingDetails)) ||
    (value.analysisSource !== 'local' && value.analysisSource !== 'semantic')
  ) {
    return undefined;
  }

  const metadataEntries = Object.entries(value.metadata);
  if (!metadataEntries.every(([, entry]) => entry === undefined || isString(entry)))
    return undefined;
  if (value.analysisSource === 'semantic' && !isRecallAnalysis(value.semantic)) return undefined;
  if (value.analysisSource === 'local' && value.semantic !== undefined) return undefined;

  return {
    status: 'complete',
    analysisVersion: ANALYSIS_VERSION,
    extractedText: value.extractedText.slice(0, MAX_OCR_TEXT_LENGTH),
    // Block text duplicates extractedText and is not needed to restore the current UI.
    blocks: [],
    category: value.category as ScreenshotCategory,
    confidence: value.confidence,
    summary: value.summary,
    suggestedAction: value.suggestedAction as SuggestedAction,
    metadata: value.metadata,
    missingDetails: value.missingDetails as string[] | undefined,
    analysisSource: value.analysisSource,
    semantic: value.semantic as ScreenshotAnalysis['semantic'],
  };
}

function validateScreenshots(value: unknown): Record<string, PersistedScreenshotState> {
  if (!isRecord(value)) return {};
  const screenshots: Record<string, PersistedScreenshotState> = {};
  for (const [id, candidate] of Object.entries(value)) {
    if (
      !isValidId(id) ||
      !isRecord(candidate) ||
      !SCREENSHOT_STATUSES.has(candidate.status as ScreenshotStatus)
    ) {
      continue;
    }
    const analysis =
      candidate.analysis === undefined ? undefined : validateAnalysis(candidate.analysis);
    screenshots[id] = {
      status: candidate.status as ScreenshotStatus,
      ...(analysis ? { analysis } : {}),
    };
  }
  return screenshots;
}

function validateLibraryItem(value: unknown): value is LibraryItem {
  if (
    !isRecord(value) ||
    !isValidId(value.id) ||
    !isValidId(value.screenshotId) ||
    !Number.isInteger(value.itemIndex) ||
    (value.itemIndex as number) < 0 ||
    !isTimestamp(value.createdAt) ||
    !isString(value.type) ||
    !LIBRARY_TYPES.has(value.type as LibraryItem['type']) ||
    !isOptionalString(value.sourceApp)
  ) {
    return false;
  }
  if (value.type === 'product') {
    return (
      isString(value.title) &&
      isOptionalString(value.currentPrice) &&
      isOptionalString(value.originalPrice) &&
      isOptionalString(value.source)
    );
  }
  if (value.type === 'place') {
    return (
      isString(value.title) && isOptionalString(value.address) && isOptionalString(value.source)
    );
  }
  return (
    isOptionalString(value.title) &&
    isOptionalString(value.author) &&
    isOptionalString(value.source) &&
    isString(value.summary) &&
    isOptionalString(value.publishedDate)
  );
}

function validateUpcomingItem(value: unknown): value is UpcomingItem {
  return (
    isRecord(value) &&
    isValidId(value.id) &&
    isValidId(value.screenshotId) &&
    Number.isInteger(value.itemIndex) &&
    (value.itemIndex as number) >= 0 &&
    isString(value.type) &&
    UPCOMING_TYPES.has(value.type as UpcomingItem['type']) &&
    isString(value.title) &&
    isOptionalString(value.location) &&
    (value.date === undefined || isTimestamp(value.date)) &&
    isOptionalString(value.rawDate) &&
    (value.reminderAt === undefined || isTimestamp(value.reminderAt)) &&
    isTimestamp(value.createdAt) &&
    isOptionalString(value.externalCalendarId) &&
    isOptionalString(value.notificationId)
  );
}

function validateAction(value: unknown): value is RecallActionRecord {
  if (
    !isRecord(value) ||
    !isValidId(value.id) ||
    !isValidId(value.screenshotId) ||
    !Number.isInteger(value.itemIndex) ||
    (value.itemIndex as number) < 0 ||
    !isString(value.type) ||
    !ACTION_TYPES.has(value.type as RecallActionType) ||
    value.status !== 'completed' ||
    !isTimestamp(value.createdAt) ||
    !isOptionalString(value.externalId)
  ) {
    return false;
  }
  return value.id === `${value.screenshotId}:${value.itemIndex}:${value.type}`;
}

function validUniqueItems<T extends { id: string }>(
  value: unknown,
  validator: (item: unknown) => item is T,
): T[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((item): item is T => {
    if (!validator(item) || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function reconcileActions(
  actions: RecallActionRecord[],
  library: LibraryItem[],
  upcoming: UpcomingItem[],
): RecallActionRecord[] {
  const reconciled = new Map(actions.map((action) => [action.id, action]));
  for (const item of library) {
    const type: RecallActionType =
      item.type === 'product'
        ? 'save_product'
        : item.type === 'place'
          ? 'save_place'
          : 'read_later';
    const id = `${item.screenshotId}:${item.itemIndex}:${type}`;
    if (!reconciled.has(id)) {
      reconciled.set(id, {
        id,
        screenshotId: item.screenshotId,
        itemIndex: item.itemIndex,
        type,
        status: 'completed',
        createdAt: item.createdAt,
      });
    }
  }
  for (const item of upcoming) {
    const type: RecallActionType = item.type === 'event' ? 'add_to_calendar' : 'create_reminder';
    const id = `${item.screenshotId}:${item.itemIndex}:${type}`;
    if (!reconciled.has(id)) {
      reconciled.set(id, {
        id,
        screenshotId: item.screenshotId,
        itemIndex: item.itemIndex,
        type,
        status: 'completed',
        createdAt: item.createdAt,
        externalId: item.type === 'event' ? item.externalCalendarId : item.notificationId,
      });
    }
  }
  return [...reconciled.values()];
}

export function migratePersistedState(raw: unknown): PersistedRecallStateV1 {
  if (!isRecord(raw) || raw.version !== PERSISTED_STATE_VERSION) {
    return createEmptyPersistedState();
  }
  const library = validUniqueItems(raw.library, validateLibraryItem);
  const upcoming = validUniqueItems(raw.upcoming, validateUpcomingItem);
  const actions = validUniqueItems(raw.actions, validateAction);
  return {
    version: PERSISTED_STATE_VERSION,
    screenshots: validateScreenshots(raw.screenshots),
    library,
    upcoming,
    actions: reconcileActions(actions, library, upcoming),
    semanticAnalysisAcknowledged: raw.semanticAnalysisAcknowledged === true,
    onboardingCompleted: raw.onboardingCompleted === true,
  };
}
