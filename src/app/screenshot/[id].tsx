import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ActionButton, type ActionButtonState } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { FadeInView } from '@/components/motion';
import { Colors, Fonts, Layout, Radius } from '@/constants/theme';
import { useActions } from '@/features/actions/context';
import {
  formatRecallDate,
  parseExactDate,
  validateDateAction,
} from '@/features/actions/date-safeguards';
import { actionTypeForItem } from '@/features/actions/execute-action';
import { suggestedActionTypeForItem } from '@/features/actions/suggestions';
import type { ExecuteActionInput, RecallActionType } from '@/features/actions/types';
import { useScreenshots } from '@/features/screenshots/context';
import type { ScreenshotStatus } from '@/features/screenshots/types';
import { useUpcoming } from '@/features/upcoming/context';
import { findDuplicateUpcoming } from '@/features/upcoming/duplicates';
import type { UpcomingItem } from '@/features/upcoming/types';
import type { RecallAnalysis, RecallDate, RecallItem } from '@/services/ai/types';
import type {
  ScreenshotAnalysis,
  ScreenshotCategory,
  SuggestedAction,
} from '@/services/understanding';
import { useAiAccess } from '@/features/ai-access/context';
import { ScreenshotImage } from '@/features/screenshots/components/screenshot-image';
import { formatScreenshotCreationDateTime } from '@/features/screenshots/creation-time';

const CATEGORY_LABELS: Record<ScreenshotCategory, string> = {
  event: 'Event',
  deadline: 'Deadline',
  product: 'Product',
  place: 'Place',
  content: 'Content',
  general: 'General',
};

const ACTION_LABELS: Record<SuggestedAction, string> = {
  add_to_calendar: 'Add to Calendar',
  create_reminder: 'Create Reminder',
  save_product: 'Save Product',
  save_place: 'Save Place',
  read_later: 'Read Later',
  keep: 'Keep',
};

const COMPLETED_LABELS: Record<RecallActionType, string> = {
  add_to_calendar: 'Added to Calendar',
  create_reminder: 'Reminder Scheduled',
  save_product: 'Saved',
  save_place: 'Saved',
  read_later: 'Saved to Read Later',
  keep: 'Kept',
};

export default function ScreenshotRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const aiAccess = useAiAccess();
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const {
    screenshots,
    setStatus,
    analyzeScreenshot,
    semanticAnalysisAcknowledged,
    acknowledgeSemanticAnalysis,
  } = useScreenshots();
  const screenshot = screenshots.find((item) => item.id === id);
  if (!screenshot) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.missingContent}>
          <ScreenshotImage
            uri={undefined}
            screenshotId={String(id ?? 'missing')}
            style={styles.missingImage}
            accessibilityLabel="Screenshot is no longer available"
          />
          <ThemedText type="subtitle">Screenshot not found</ThemedText>
          <ThemedText themeColor="textSecondary">
            This screenshot is no longer available in your accessible Gallery items.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }
  const date = formatScreenshotCreationDateTime(screenshot.creationTime);
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View screenshot full screen"
          onPress={() => setShowFullImage(true)}
          style={styles.preview}
        >
          <ScreenshotImage
            uri={screenshot.uri}
            screenshotId={screenshot.id}
            style={styles.image}
            accessibilityLabel={screenshot.filename ?? 'Screenshot'}
          />
          {screenshot.analysis.status === 'processing' ? <AnalysisScanOverlay /> : null}
          <ThemedText type="smallBold" style={styles.previewLabel}>
            Tap to expand
          </ThemedText>
        </Pressable>
        <View style={styles.metadata}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {screenshot.filename ?? 'Unnamed screenshot'}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {date ?? `${screenshot.width} x ${screenshot.height}`}
          </ThemedText>
          {__DEV__ ? (
            <ThemedText type="small" themeColor="textSecondary">
              Asset ID: {screenshot.id}
            </ThemedText>
          ) : null}
        </View>
        <View accessibilityRole="tablist" style={styles.actions}>
          {(['kept', 'ignored', 'processed'] as ScreenshotStatus[]).map((status) => (
            <Pressable
              key={status}
              accessibilityRole="tab"
              accessibilityState={{ selected: screenshot.status === status }}
              onPress={() => setStatus(screenshot.id, status)}
              style={[styles.statusButton, screenshot.status === status && styles.statusSelected]}
            >
              <ThemedText type="smallBold">
                {status === 'processed' ? 'Processed' : status[0].toUpperCase() + status.slice(1)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <AnalysisSection
          screenshotId={screenshot.id}
          analysis={screenshot.analysis}
          showExtractedText={showExtractedText}
          semanticAnalysisAcknowledged={semanticAnalysisAcknowledged}
          acknowledgeSemanticAnalysis={acknowledgeSemanticAnalysis}
          aiAccessInitialized={aiAccess.initialized}
          aiActivated={aiAccess.activated}
          onActivateAi={() => router.push('/ai-access')}
          onToggleExtractedText={() => setShowExtractedText((current) => !current)}
          onAnalyze={(options) => void analyzeScreenshot(screenshot.id, options)}
        />
      </ScrollView>
      <Modal
        visible={showFullImage}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullImage(false)}
      >
        <View style={styles.fullImageBackdrop}>
          <ScreenshotImage
            uri={screenshot.uri}
            screenshotId={screenshot.id}
            style={styles.fullImage}
            accessibilityLabel={screenshot.filename ?? 'Screenshot'}
          />
          <ActionButton
            label="Close"
            variant="secondary"
            onPress={() => setShowFullImage(false)}
            style={styles.fullImageClose}
          />
        </View>
      </Modal>
    </ThemedView>
  );
}

function AnalysisScanOverlay() {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * 154 }],
    opacity: reduceMotion ? 0.45 : 0.75,
  }));
  return (
    <View pointerEvents="none" style={styles.scanArea} accessibilityLabel="Analysis in progress">
      <Animated.View style={[styles.scanLine, animatedStyle]} />
    </View>
  );
}

function AnalysisSection({
  screenshotId,
  analysis,
  showExtractedText,
  onToggleExtractedText,
  onAnalyze,
  semanticAnalysisAcknowledged,
  acknowledgeSemanticAnalysis,
  aiAccessInitialized,
  aiActivated,
  onActivateAi,
}: {
  screenshotId: string;
  analysis: ScreenshotAnalysis;
  showExtractedText: boolean;
  onToggleExtractedText: () => void;
  onAnalyze: (options?: { useAi?: boolean; reanalyze?: boolean }) => void;
  semanticAnalysisAcknowledged: boolean;
  acknowledgeSemanticAnalysis: () => void;
  aiAccessInitialized: boolean;
  aiActivated: boolean;
  onActivateAi: () => void;
}) {
  return (
    <View style={styles.analysis}>
      <ThemedText type="smallBold" style={styles.sectionLabel}>
        ANALYSIS
      </ThemedText>
      {analysis.status === 'idle' ? (
        <>
          {!semanticAnalysisAcknowledged ? (
            <>
              <ThemedText themeColor="textSecondary">
                To understand layout and relationships, Recall securely sends a compressed version
                of this screenshot and its extracted text to its AI analysis service. Recall will
                not act on the result without your choice.
              </ThemedText>
              {aiActivated ? (
                <PrimaryButton
                  label="Continue with Secure Analysis"
                  onPress={() => {
                    acknowledgeSemanticAnalysis();
                    onAnalyze({ useAi: true });
                  }}
                />
              ) : (
                <ActionButton
                  label={aiAccessInitialized ? 'Activate Recall AI' : 'Checking AI access…'}
                  state={aiAccessInitialized ? 'idle' : 'disabled'}
                  onPress={onActivateAi}
                />
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => onAnalyze({ useAi: false })}
                style={styles.textToggle}
              >
                <ThemedText type="linkPrimary">Use on-device analysis only</ThemedText>
              </Pressable>
            </>
          ) : aiActivated ? (
            <PrimaryButton label="Analyze screenshot" onPress={() => onAnalyze({ useAi: true })} />
          ) : (
            <>
              <ThemedText themeColor="textSecondary">
                Activate Recall AI with an invitation, or keep analysis on this device.
              </ThemedText>
              <ActionButton
                label={aiAccessInitialized ? 'Activate Recall AI' : 'Checking AI access…'}
                state={aiAccessInitialized ? 'idle' : 'disabled'}
                onPress={onActivateAi}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => onAnalyze({ useAi: false })}
                style={styles.textToggle}
              >
                <ThemedText type="linkPrimary">Use on-device analysis only</ThemedText>
              </Pressable>
            </>
          )}
        </>
      ) : null}
      {analysis.status === 'processing' ? (
        <View style={styles.processing}>
          <ActivityIndicator color={Colors.dark.accent} />
          <View style={styles.processingCopy}>
            <ThemedText type="smallBold">Analyzing screenshot</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Reading visible content and preparing useful actions. You can keep browsing this page.
            </ThemedText>
          </View>
        </View>
      ) : null}
      {analysis.status === 'failed' ? (
        <>
          <ThemedText>{analysis.error}</ThemedText>
          <PrimaryButton label="Try Again" onPress={() => onAnalyze({ useAi: aiActivated })} />
        </>
      ) : null}
      {analysis.status === 'complete' && analysis.analysisSource ? (
        <ThemedView type="backgroundElement" style={styles.sourceNotice}>
          <ThemedText type="smallBold">
            {analysis.analysisSource === 'semantic' ? 'AI analysis complete' : 'On-device result'}
          </ThemedText>
          {analysis.analysisSource === 'local' && analysis.error ? (
            <ThemedText type="small" themeColor="textSecondary">
              {analysis.error}
            </ThemedText>
          ) : null}
        </ThemedView>
      ) : null}
      {analysis.status === 'complete' ? (
        <FadeInView>
          {analysis.semantic ? (
            <SemanticResult screenshotId={screenshotId} analysis={analysis.semantic} />
          ) : (
            <LocalResult screenshotId={screenshotId} analysis={analysis} />
          )}
        </FadeInView>
      ) : null}
      {analysis.status === 'complete' ? (
        <>
          {analysis.analysisSource === 'semantic' && aiActivated ? (
            <ActionButton
              label="Reanalyze with Recall AI"
              variant="secondary"
              onPress={() => onAnalyze({ useAi: true, reanalyze: true })}
            />
          ) : null}
          {analysis.analysisSource === 'local' && !aiActivated ? (
            <ActionButton label="Activate Recall AI" variant="secondary" onPress={onActivateAi} />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showExtractedText }}
            onPress={onToggleExtractedText}
            style={styles.textToggle}
          >
            <ThemedText type="linkPrimary">
              {showExtractedText ? 'Hide extracted text' : 'View extracted text'}
            </ThemedText>
          </Pressable>
          {showExtractedText ? (
            <ThemedView type="backgroundElement" style={styles.extractedText}>
              <ThemedText type="code">
                {analysis.extractedText || 'No readable text was found in this screenshot.'}
              </ThemedText>
            </ThemedView>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function LocalResult({
  screenshotId,
  analysis,
}: {
  screenshotId: string;
  analysis: ScreenshotAnalysis;
}) {
  const item = localAnalysisItem(analysis);
  return (
    <View style={styles.details}>
      <Detail label="Detected type" value={CATEGORY_LABELS[analysis.category]} />
      <Detail label="Confidence" value={`${Math.round(analysis.confidence * 100)}% confidence`} />
      <Detail label="Summary" value={analysis.summary} />
      <Detail label="Title" value={analysis.metadata.title} />
      <Detail label="Date" value={formatDate(analysis.metadata.date)} />
      <Detail label="Time" value={formatTime(analysis.metadata.time)} />
      <Detail label="Location" value={analysis.metadata.location} />
      {analysis.category === 'product' ? (
        <Detail label="Price" value={analysis.metadata.price} />
      ) : null}
      {analysis.missingDetails?.map((detail) => (
        <ThemedText key={detail} themeColor="textSecondary">
          Missing: {detail}
        </ThemedText>
      ))}
      <Detail label="Suggested action" value={ACTION_LABELS[analysis.suggestedAction]} />
      <ItemAction screenshotId={screenshotId} itemIndex={0} item={item} />
    </View>
  );
}

function SemanticResult({
  screenshotId,
  analysis,
}: {
  screenshotId: string;
  analysis: RecallAnalysis;
}) {
  const { executeAction, getAction } = useActions();
  const [savingAll, setSavingAll] = useState(false);
  const productEntries = analysis.items
    .map((item, index) => ({ item, index }))
    .filter((entry): entry is { item: Extract<RecallItem, { type: 'product' }>; index: number } =>
      Boolean(entry.item.type === 'product'),
    );
  const actionableProductEntries = productEntries.filter(
    ({ item }) => suggestedActionTypeForItem(item, analysis.suggestedActions) === 'save_product',
  );
  const allProductsSaved =
    actionableProductEntries.length > 0 &&
    actionableProductEntries.every(
      ({ index }) => getAction(screenshotId, index, 'save_product')?.status === 'completed',
    );

  return (
    <View style={styles.details}>
      <Detail
        label="Detected type"
        value={analysis.category[0].toUpperCase() + analysis.category.slice(1)}
      />
      <Detail label="Confidence" value={`${Math.round(analysis.confidence * 100)}% confidence`} />
      <Detail label="Summary" value={analysis.summary} />
      {analysis.cardinality === 'multiple' ? (
        <ThemedText type="smallBold">
          {productEntries.length === analysis.items.length
            ? `${productEntries.length} products found`
            : `${analysis.items.length} items found`}
        </ThemedText>
      ) : null}
      {actionableProductEntries.length > 1 ? (
        <ActionButton
          label={allProductsSaved ? 'All Products Saved' : 'Save All Products'}
          loadingLabel="Saving products..."
          successLabel="All Products Saved"
          state={allProductsSaved ? 'success' : savingAll ? 'loading' : 'idle'}
          onPress={() => {
            setSavingAll(true);
            void Promise.all(
              actionableProductEntries.map(({ item, index }) =>
                executeAction({
                  screenshotId,
                  itemIndex: index,
                  item,
                  sourceApp: analysis.sourceApp,
                }),
              ),
            ).finally(() => setSavingAll(false));
          }}
        />
      ) : null}
      {analysis.items.map((item, index) => (
        <SemanticItem
          key={`${item.type}-${index}`}
          screenshotId={screenshotId}
          sourceApp={analysis.sourceApp}
          itemIndex={index}
          item={item}
          suggestedActions={analysis.suggestedActions}
        />
      ))}
      {analysis.suggestedActions.length > 0 ? (
        <Detail
          label="Suggested action"
          value={analysis.suggestedActions.map(formatAction).join(', ')}
        />
      ) : null}
    </View>
  );
}

function SemanticItem({
  screenshotId,
  sourceApp,
  itemIndex,
  item,
  suggestedActions,
}: {
  screenshotId: string;
  sourceApp?: string;
  itemIndex: number;
  item: RecallItem;
  suggestedActions: RecallActionType[];
}) {
  const actionType = suggestedActionTypeForItem(item, suggestedActions);
  return (
    <ThemedView type="backgroundElement" style={styles.item}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        ITEM {itemIndex + 1}
      </ThemedText>
      {item.type === 'product' ? (
        <>
          <Detail label="Product" value={item.title} />
          <Detail label="Price" value={item.currentPrice?.raw} />
          <Detail label="Was" value={item.originalPrice?.raw} />
        </>
      ) : null}
      {item.type === 'event' ? (
        <>
          <Detail label="Event" value={item.title} />
          <Detail label="Location" value={item.location} />
          <Detail label="Date" value={formatRecallDates(item.dates)} />
          {item.missingDetails?.map((detail) => (
            <ThemedText key={detail} themeColor="textSecondary">
              Missing: {detail}
            </ThemedText>
          ))}
        </>
      ) : null}
      {item.type === 'deadline' ? (
        <>
          <Detail label="Deadline" value={item.title} />
          <Detail label="Organization" value={item.organization} />
          <Detail label="Date" value={formatRecallDates(item.dates)} />
        </>
      ) : null}
      {item.type === 'place' ? (
        <>
          <Detail label="Place" value={item.title} />
          <Detail label="Address" value={item.address} />
        </>
      ) : null}
      {item.type === 'content' ? (
        <>
          <Detail label="Content" value={item.title} />
          <Detail label="Author" value={item.author} />
          <Detail label="Source" value={item.source} />
          <Detail label="Summary" value={item.summary} />
          <Detail label="Published" value={formatRecallDates(item.dates)} />
        </>
      ) : null}
      {item.type === 'general' ? <Detail label="Summary" value={item.summary} /> : null}
      {actionType ? (
        <ItemAction
          screenshotId={screenshotId}
          sourceApp={sourceApp}
          itemIndex={itemIndex}
          item={item}
        />
      ) : null}
    </ThemedView>
  );
}

function ItemAction({
  screenshotId,
  sourceApp,
  itemIndex,
  item,
}: {
  screenshotId: string;
  sourceApp?: string;
  itemIndex: number;
  item: RecallItem;
}) {
  const [showForm, setShowForm] = useState(false);
  const [duplicateRequest, setDuplicateRequest] = useState<{
    duplicate: UpcomingItem;
    values: Partial<ExecuteActionInput>;
  } | null>(null);
  const { executeAction, getAction } = useActions();
  const upcoming = useUpcoming();
  const input = { screenshotId, sourceApp, itemIndex, item };
  const actionType = actionTypeForItem(input);
  const action = getAction(screenshotId, itemIndex, actionType);
  const needsDateForm = item.type === 'event' || item.type === 'deadline';
  const label =
    action?.status === 'completed'
      ? COMPLETED_LABELS[actionType]
      : action?.status === 'processing'
        ? 'Working...'
        : ACTION_LABELS[actionType];

  return (
    <>
      <PrimaryButton
        label={label}
        state={
          action?.status === 'processing'
            ? 'loading'
            : action?.status === 'completed'
              ? 'success'
              : 'idle'
        }
        disabled={action?.status === 'completed' || action?.status === 'processing'}
        onPress={() => {
          if (needsDateForm) setShowForm(true);
          else void executeAction(input);
        }}
      />
      {action?.status === 'failed' && !showForm ? (
        <>
          <ThemedText type="small" style={styles.errorText}>
            {action.error}
          </ThemedText>
          {__DEV__ && action.debugMessage ? (
            <ThemedText type="small" style={styles.errorText}>
              Calendar debug: {action.debugMessage}
            </ThemedText>
          ) : null}
        </>
      ) : null}
      {needsDateForm && showForm ? (
        <DateActionModal
          item={item}
          actionError={action?.status === 'failed' ? action.error : undefined}
          actionDebugMessage={action?.debugMessage}
          onClose={() => setShowForm(false)}
          onSubmit={async (values) => {
            const duplicate = findDuplicateUpcoming(upcoming.items, {
              type: item.type as 'event' | 'deadline',
              title: values.title ?? item.title,
              location: item.type === 'event' ? (values.location ?? item.location) : undefined,
              date: values.exactDate?.getTime(),
            });
            if (duplicate) {
              setShowForm(false);
              setDuplicateRequest({ duplicate, values });
              return;
            }
            const succeeded = await executeAction({ ...input, ...values });
            if (succeeded) setShowForm(false);
          }}
        />
      ) : null}
      <ConfirmationModal
        visible={duplicateRequest !== null}
        title={
          duplicateRequest?.duplicate.type === 'event'
            ? 'Similar event already exists'
            : 'Similar reminder already exists'
        }
        message={duplicateRequest ? duplicateMessage(duplicateRequest.duplicate) : ''}
        confirmLabel={duplicateRequest?.duplicate.type === 'event' ? 'Add Anyway' : 'Create Anyway'}
        onCancel={() => setDuplicateRequest(null)}
        onConfirm={() => {
          const request = duplicateRequest;
          setDuplicateRequest(null);
          if (request) {
            void executeAction({
              ...input,
              ...request.values,
              allowSemanticDuplicate: true,
            });
          }
        }}
      />
    </>
  );
}

function duplicateMessage(item: UpcomingItem): string {
  if (item.type === 'event') return `${item.title} is already in Upcoming.`;
  const date = item.date
    ? new Date(item.date).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : undefined;
  return date
    ? `${item.title} is already scheduled for ${date}.`
    : `${item.title} already has a reminder in Upcoming.`;
}

function DateActionModal({
  item,
  actionError,
  actionDebugMessage,
  onClose,
  onSubmit,
}: {
  item: Extract<RecallItem, { type: 'event' | 'deadline' }>;
  actionError?: string;
  actionDebugMessage?: string;
  onClose: () => void;
  onSubmit: (values: Partial<ExecuteActionInput>) => Promise<void>;
}) {
  const initial = getExactDateParts(item.dates);
  const [title, setTitle] = useState(item.title);
  const [location, setLocation] = useState(item.type === 'event' ? (item.location ?? '') : '');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [timing, setTiming] = useState<ExecuteActionInput['reminderTiming']>('at_deadline');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <ThemedView style={styles.modalContent}>
          <ThemedText type="smallBold">
            {item.type === 'event' ? 'Add to Calendar' : 'Create Reminder'}
          </ThemedText>
          <Field label="Title" value={title} onChangeText={setTitle} />
          {item.type === 'event' ? (
            <Field label="Location" value={location} onChangeText={setLocation} />
          ) : null}
          {item.dates[0] && item.dates[0].precision !== 'exact' ? (
            <ThemedText type="small" themeColor="textSecondary">
              Found: {item.dates[0].normalized ?? item.dates[0].raw}. An exact date and time are
              required.
            </ThemedText>
          ) : null}
          <Field
            label="Date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
          <Field
            label="Time"
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
          />
          {item.type === 'deadline' ? (
            <View style={styles.timingGroup}>
              <ThemedText type="small" themeColor="textSecondary">
                Remind me
              </ThemedText>
              {(
                [
                  ['at_deadline', 'At deadline'],
                  ['one_hour_before', '1 hour before'],
                  ['one_day_before', '1 day before'],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: timing === value }}
                  onPress={() => setTiming(value)}
                  style={[styles.timingOption, timing === value && styles.timingSelected]}
                >
                  <ThemedText type="smallBold">{label}</ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
          {error || actionError ? (
            <ThemedText style={styles.errorText}>{error ?? actionError}</ThemedText>
          ) : null}
          {__DEV__ && actionDebugMessage ? (
            <ThemedText type="small" style={styles.errorText}>
              Calendar debug: {actionDebugMessage}
            </ThemedText>
          ) : null}
          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}>
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Pressable>
            <ActionButton
              label="Continue"
              loadingLabel="Working..."
              state={submitting ? 'loading' : 'idle'}
              onPress={() => {
                const exactDate = parseExactDate(date, time);
                if (!title.trim()) {
                  setError('A title is required.');
                  return;
                }
                if (!exactDate) {
                  setError('Enter an exact date and time in the formats shown.');
                  return;
                }
                const dateError = validateDateAction(item.type, exactDate, timing);
                if (dateError) {
                  setError(dateError);
                  return;
                }
                setError(null);
                setSubmitting(true);
                void onSubmit({
                  exactDate,
                  title: title.trim(),
                  location: location.trim() || undefined,
                  reminderTiming: item.type === 'deadline' ? timing : undefined,
                }).finally(() => setSubmitting(false));
              }}
              style={styles.modalPrimary}
            />
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput style={styles.input} placeholderTextColor="#8e8e93" {...props} />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
  state,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  state?: ActionButtonState;
}) {
  return (
    <ActionButton
      label={label}
      loadingLabel={label}
      successLabel={label}
      state={state ?? (disabled ? 'disabled' : 'idle')}
      onPress={onPress}
    />
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText>{value}</ThemedText>
    </View>
  );
}

function localAnalysisItem(analysis: ScreenshotAnalysis): RecallItem {
  const title = analysis.metadata.title ?? analysis.summary;
  const dates: RecallDate[] = analysis.metadata.date
    ? [
        {
          type: analysis.category === 'deadline' ? 'deadline' : 'event',
          raw: analysis.metadata.date,
          normalized:
            analysis.metadata.datePrecision === 'exact' && analysis.metadata.time
              ? `${analysis.metadata.date}T${analysis.metadata.time}`
              : analysis.metadata.date,
          precision: analysis.metadata.datePrecision ?? 'unknown',
          confidence: analysis.confidence,
        },
      ]
    : [];
  if (analysis.category === 'event') {
    return {
      type: 'event',
      title,
      location: analysis.metadata.location,
      dates,
      confidence: analysis.confidence,
      missingDetails: analysis.missingDetails,
    };
  }
  if (analysis.category === 'deadline') {
    return { type: 'deadline', title, dates, confidence: analysis.confidence };
  }
  if (analysis.category === 'product') {
    return {
      type: 'product',
      title,
      currentPrice: analysis.metadata.price
        ? {
            amount: Number.parseFloat(analysis.metadata.price.replace(/[^0-9.]/g, '')) || 0,
            currency: analysis.metadata.currency ?? '',
            raw: analysis.metadata.price,
          }
        : undefined,
      confidence: analysis.confidence,
    };
  }
  if (analysis.category === 'place') {
    return {
      type: 'place',
      title,
      address: analysis.metadata.location,
      confidence: analysis.confidence,
    };
  }
  if (analysis.category === 'content') {
    return {
      type: 'content',
      title,
      summary: analysis.summary,
      dates: [],
      confidence: analysis.confidence,
    };
  }
  return { type: 'general', summary: analysis.summary, confidence: analysis.confidence };
}

function getExactDateParts(dates: RecallDate[]): { date: string; time: string } {
  const exact = dates.find((date) => date.precision === 'exact' && date.normalized)?.normalized;
  if (!exact) return { date: '', time: '' };
  const match = exact.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/);
  return { date: match?.[1] ?? '', time: match?.[2] ?? '' };
}

function formatRecallDates(dates: RecallDate[]): string | undefined {
  return dates.length ? dates.map(formatRecallDate).join(', ') : undefined;
}

function formatAction(action: string): string {
  return action.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(value?: string): string | undefined {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return value;
  const [hour, minute] = value.split(':').map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 14, padding: Layout.screenPadding, paddingBottom: 48 },
  missingContent: { padding: Layout.screenPadding, gap: 12 },
  missingImage: { width: '100%', height: 180, borderRadius: Radius.large },
  preview: {
    width: '100%',
    height: 210,
    overflow: 'hidden',
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: '#05070A',
  },
  image: { width: '100%', height: '100%' },
  previewLabel: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.small,
  },
  scanArea: { ...StyleSheet.absoluteFill, paddingVertical: 24, overflow: 'hidden' },
  scanLine: { height: 2, backgroundColor: Colors.dark.accent },
  fullImageBackdrop: {
    flex: 1,
    backgroundColor: Colors.dark.overlay,
    padding: 16,
    paddingTop: 44,
    paddingBottom: 28,
  },
  fullImage: { flex: 1, width: '100%' },
  fullImageClose: { alignSelf: 'center', minWidth: 140, marginTop: 12 },
  metadata: { gap: 4 },
  actions: { flexDirection: 'row', gap: 6 },
  statusButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statusSelected: { backgroundColor: Colors.dark.accentMuted, borderColor: Colors.dark.accent },
  analysis: {
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
    paddingTop: 24,
    marginTop: 8,
  },
  sectionLabel: { color: Colors.dark.textSecondary },
  sourceNotice: { padding: 12, borderRadius: Radius.medium, gap: 3 },
  processing: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  processingCopy: { flex: 1, gap: 2 },
  details: { gap: 12, paddingVertical: 4 },
  detailRow: { gap: 2 },
  textToggle: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  extractedText: { padding: 14, borderRadius: Radius.medium },
  item: {
    gap: 8,
    borderRadius: Radius.large,
    padding: 14,
  },
  errorText: { color: Colors.dark.danger },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.dark.overlay,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 20,
    borderRadius: Radius.large,
    gap: 14,
  },
  field: { gap: 5 },
  input: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.backgroundElement,
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  timingGroup: { gap: 8 },
  timingOption: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8 },
  timingSelected: { backgroundColor: Colors.dark.accentMuted },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  secondaryButton: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 14 },
  modalPrimary: { minWidth: 110 },
});
