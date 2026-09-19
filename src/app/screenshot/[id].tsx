import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActions } from '@/features/actions/context';
import { actionTypeForItem } from '@/features/actions/execute-action';
import type { ExecuteActionInput, RecallActionType } from '@/features/actions/types';
import { useScreenshots } from '@/features/screenshots/context';
import type { ScreenshotStatus } from '@/features/screenshots/types';
import type { RecallAnalysis, RecallDate, RecallItem } from '@/services/ai/types';
import type {
  ScreenshotAnalysis,
  ScreenshotCategory,
  SuggestedAction,
} from '@/services/understanding';

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
  const [showExtractedText, setShowExtractedText] = useState(false);
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
        <ThemedText type="subtitle">Screenshot not found.</ThemedText>
        <ThemedText themeColor="textSecondary">
          This screenshot is no longer available in the current session.
        </ThemedText>
      </ThemedView>
    );
  }
  const date = screenshot.creationTime
    ? new Date(screenshot.creationTime * 1000).toLocaleString()
    : null;
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={{ uri: screenshot.uri }}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={screenshot.filename ?? 'Screenshot'}
        />
        <ThemedText type="subtitle">Screenshot</ThemedText>
        <View style={styles.metadata}>
          <ThemedText>{screenshot.filename ?? 'Unnamed screenshot'}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {screenshot.width} x {screenshot.height}
            {date ? ` · ${date}` : ''}
          </ThemedText>
          <ThemedText themeColor="textSecondary">Status: {screenshot.status}</ThemedText>
        </View>
        <View style={styles.actions}>
          {(['kept', 'ignored', 'processed'] as ScreenshotStatus[]).map((status) => (
            <PrimaryButton
              key={status}
              label={
                status === 'processed'
                  ? 'Mark Processed'
                  : status[0].toUpperCase() + status.slice(1)
              }
              onPress={() => setStatus(screenshot.id, status)}
            />
          ))}
        </View>
        <AnalysisSection
          screenshotId={screenshot.id}
          analysis={screenshot.analysis}
          showExtractedText={showExtractedText}
          semanticAnalysisAcknowledged={semanticAnalysisAcknowledged}
          acknowledgeSemanticAnalysis={acknowledgeSemanticAnalysis}
          onToggleExtractedText={() => setShowExtractedText((current) => !current)}
          onAnalyze={() => void analyzeScreenshot(screenshot.id)}
        />
      </ScrollView>
    </ThemedView>
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
}: {
  screenshotId: string;
  analysis: ScreenshotAnalysis;
  showExtractedText: boolean;
  onToggleExtractedText: () => void;
  onAnalyze: () => void;
  semanticAnalysisAcknowledged: boolean;
  acknowledgeSemanticAnalysis: () => void;
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
                of this screenshot to its analysis service.
              </ThemedText>
              <PrimaryButton
                label="Continue with Secure Analysis"
                onPress={() => {
                  acknowledgeSemanticAnalysis();
                  onAnalyze();
                }}
              />
              <Pressable onPress={onAnalyze} style={styles.textToggle}>
                <ThemedText type="linkPrimary">Use on-device analysis only</ThemedText>
              </Pressable>
            </>
          ) : (
            <PrimaryButton label="Analyze Screenshot" onPress={onAnalyze} />
          )}
        </>
      ) : null}
      {analysis.status === 'processing' ? (
        <View style={styles.processing}>
          <ActivityIndicator />
          <ThemedText>Understanding screenshot...</ThemedText>
        </View>
      ) : null}
      {analysis.status === 'failed' ? (
        <>
          <ThemedText>{analysis.error}</ThemedText>
          <PrimaryButton label="Try Again" onPress={onAnalyze} />
        </>
      ) : null}
      {__DEV__ && analysis.status === 'complete' && analysis.analysisSource ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.analysisSource}>
          Analysis source:{' '}
          {analysis.analysisSource === 'semantic' ? 'Semantic' : 'On-device fallback'}
        </ThemedText>
      ) : null}
      {analysis.status === 'complete' ? (
        analysis.semantic ? (
          <SemanticResult screenshotId={screenshotId} analysis={analysis.semantic} />
        ) : (
          <LocalResult screenshotId={screenshotId} analysis={analysis} />
        )
      ) : null}
      {analysis.status === 'complete' ? (
        <>
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
  const productEntries = analysis.items
    .map((item, index) => ({ item, index }))
    .filter((entry): entry is { item: Extract<RecallItem, { type: 'product' }>; index: number } =>
      Boolean(entry.item.type === 'product'),
    );
  const allProductsSaved =
    productEntries.length > 0 &&
    productEntries.every(
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
      {productEntries.length > 1 ? (
        <PrimaryButton
          label={allProductsSaved ? 'All Products Saved' : 'Save All Products'}
          disabled={allProductsSaved}
          onPress={() => {
            void Promise.all(
              productEntries.map(({ item, index }) =>
                executeAction({
                  screenshotId,
                  itemIndex: index,
                  item,
                  sourceApp: analysis.sourceApp,
                }),
              ),
            );
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
        />
      ))}
      <Detail
        label="Suggested action"
        value={analysis.suggestedActions.map(formatAction).join(', ')}
      />
    </View>
  );
}

function SemanticItem({
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
  return (
    <View style={styles.item}>
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
          <Detail label="Summary" value={item.summary} />
        </>
      ) : null}
      {item.type === 'general' ? <Detail label="Summary" value={item.summary} /> : null}
      <ItemAction
        screenshotId={screenshotId}
        sourceApp={sourceApp}
        itemIndex={itemIndex}
        item={item}
      />
    </View>
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
  const { executeAction, getAction } = useActions();
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
            const succeeded = await executeAction({ ...input, ...values });
            if (succeeded) setShowForm(false);
          }}
        />
      ) : null}
    </>
  );
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
            <Pressable
              accessibilityRole="button"
              disabled={submitting}
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
                setError(null);
                setSubmitting(true);
                void onSubmit({
                  exactDate,
                  title: title.trim(),
                  location: location.trim() || undefined,
                  reminderTiming: item.type === 'deadline' ? timing : undefined,
                }).finally(() => setSubmitting(false));
              }}
              style={[styles.button, submitting && styles.buttonDisabled, styles.modalPrimary]}
            >
              <ThemedText style={styles.buttonText}>
                {submitting ? 'Working...' : 'Continue'}
              </ThemedText>
            </Pressable>
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
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <ThemedText style={styles.buttonText}>{label}</ThemedText>
    </Pressable>
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

function parseExactDate(date: string, time: string): Date | null {
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const [, year, month, day] = dateMatch.map(Number);
  const [, hour, minute] = timeMatch.map(Number);
  if (month < 1 || month > 12 || hour > 23 || minute > 59) return null;
  const value = new Date(year, month - 1, day, hour, minute);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day) {
    return null;
  }
  return value;
}

function formatRecallDates(dates: RecallDate[]): string | undefined {
  return dates.length ? dates.map((date) => date.normalized ?? date.raw).join(', ') : undefined;
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
  container: { flex: 1, padding: 24 },
  content: { gap: 16, paddingBottom: 40 },
  image: { width: '100%', height: 420, backgroundColor: '#e5e5e8' },
  metadata: { gap: 4 },
  actions: { gap: 10 },
  button: {
    backgroundColor: '#208AEF',
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontWeight: '700' },
  analysis: {
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#8e8e93',
    paddingTop: 24,
    marginTop: 8,
  },
  sectionLabel: { color: '#60646C' },
  analysisSource: { opacity: 0.75 },
  processing: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  details: { gap: 12, paddingVertical: 4 },
  detailRow: { gap: 2 },
  textToggle: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  extractedText: { padding: 14, borderRadius: 8 },
  item: {
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c7c7cc',
    paddingTop: 12,
  },
  errorText: { color: '#b42318' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 20,
    borderRadius: 8,
    gap: 14,
  },
  field: { gap: 5 },
  input: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8e8e93',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#111827',
    backgroundColor: '#ffffff',
    fontSize: 16,
  },
  timingGroup: { gap: 8 },
  timingOption: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8 },
  timingSelected: { backgroundColor: '#dbeafe' },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  secondaryButton: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 14 },
  modalPrimary: { minWidth: 110 },
});
