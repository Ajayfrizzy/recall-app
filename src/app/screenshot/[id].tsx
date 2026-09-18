import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useScreenshots } from '@/features/screenshots/context';
import type { ScreenshotStatus } from '@/features/screenshots/types';
import type {
  ScreenshotAnalysis,
  ScreenshotCategory,
  SuggestedAction,
} from '@/services/understanding';
import type { RecallAnalysis, RecallItem } from '@/services/ai/types';

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
  if (!screenshot)
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Screenshot not found.</ThemedText>
        <ThemedText themeColor="textSecondary">
          This screenshot is no longer available in the current session.
        </ThemedText>
      </ThemedView>
    );
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
            <Pressable
              key={status}
              accessibilityRole="button"
              onPress={() => setStatus(screenshot.id, status)}
              style={styles.button}
            >
              <ThemedText style={styles.buttonText}>
                {status === 'processed'
                  ? 'Mark Processed'
                  : status[0].toUpperCase() + status.slice(1)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <AnalysisSection
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
  analysis,
  showExtractedText,
  onToggleExtractedText,
  onAnalyze,
  semanticAnalysisAcknowledged,
  acknowledgeSemanticAnalysis,
}: {
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
          <SemanticResult analysis={analysis.semantic} />
        ) : (
          <>
            <Detail label="Detected type" value={CATEGORY_LABELS[analysis.category]} />
            <Detail
              label="Confidence"
              value={`${Math.round(analysis.confidence * 100)}% confidence`}
            />
            <Detail label="Summary" value={analysis.summary} />
            <View style={styles.details}>
              <ThemedText type="smallBold">Extracted details</ThemedText>
              <Detail label="Title" value={analysis.metadata.title} />
              <Detail label="Date" value={formatDate(analysis.metadata.date)} />
              <Detail label="Time" value={formatTime(analysis.metadata.time)} />
              <Detail label="Location" value={analysis.metadata.location} />
              {analysis.category === 'product' ? (
                <Detail label="Price" value={analysis.metadata.price} />
              ) : null}
              <Detail label="URL" value={analysis.metadata.url} />
            </View>
            {analysis.missingDetails && analysis.missingDetails.length > 0 ? (
              <View style={styles.details}>
                <ThemedText type="smallBold">Missing details</ThemedText>
                {analysis.missingDetails.map((detail) => (
                  <ThemedText key={detail} themeColor="textSecondary">
                    {detail}
                  </ThemedText>
                ))}
              </View>
            ) : null}
            <Detail label="Suggested action" value={ACTION_LABELS[analysis.suggestedAction]} />
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
        )
      ) : null}
    </View>
  );
}

function SemanticResult({ analysis }: { analysis: RecallAnalysis }) {
  return (
    <View style={styles.details}>
      <Detail
        label="Detected type"
        value={analysis.category[0].toUpperCase() + analysis.category.slice(1)}
      />
      <Detail label="Confidence" value={`${Math.round(analysis.confidence * 100)}% confidence`} />
      <Detail label="Summary" value={analysis.summary} />
      {analysis.cardinality === 'multiple' ? (
        <ThemedText type="smallBold">{analysis.items.length} items found</ThemedText>
      ) : null}
      {analysis.items.map((item, index) => (
        <SemanticItem key={`${item.type}-${index}`} item={item} />
      ))}
      <Detail
        label="Suggested action"
        value={analysis.suggestedActions.map(formatAction).join(', ')}
      />
    </View>
  );
}

function SemanticItem({ item }: { item: RecallItem }) {
  if (item.type === 'product')
    return (
      <View style={styles.item}>
        <Detail label="Product" value={item.title} />
        <Detail label="Price" value={item.currentPrice?.raw} />
        <Detail label="Was" value={item.originalPrice?.raw} />
        <PrimaryButton label="Save Product" onPress={() => undefined} />
      </View>
    );
  if (item.type === 'event')
    return (
      <View style={styles.item}>
        <Detail label="Event" value={item.title} />
        <Detail label="Location" value={item.location} />
        <Detail
          label="Date"
          value={item.dates.map((date) => date.normalized ?? date.raw).join(', ')}
        />
        {item.missingDetails?.map((detail) => (
          <ThemedText key={detail} themeColor="textSecondary">
            Missing: {detail}
          </ThemedText>
        ))}
      </View>
    );
  if (item.type === 'deadline')
    return (
      <View style={styles.item}>
        <Detail label="Deadline" value={item.title} />
        <Detail
          label="Date"
          value={item.dates.map((date) => date.normalized ?? date.raw).join(', ')}
        />
      </View>
    );
  if (item.type === 'place')
    return (
      <View style={styles.item}>
        <Detail label="Place" value={item.title} />
        <Detail label="Address" value={item.address} />
      </View>
    );
  if (item.type === 'content')
    return (
      <View style={styles.item}>
        <Detail label="Content" value={item.title} />
        <Detail label="Author" value={item.author} />
        <Detail label="Summary" value={item.summary} />
      </View>
    );
  return (
    <View style={styles.item}>
      <Detail label="Summary" value={item.summary} />
    </View>
  );
}

function formatAction(action: string): string {
  return action.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <ThemedText style={styles.buttonText}>{label}</ThemedText>
    </Pressable>
  );
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
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
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
});
