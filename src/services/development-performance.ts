export type DevelopmentPerformanceStage =
  | 'ocr'
  | 'image_preparation'
  | 'prepared_image'
  | 'backend_round_trip'
  | 'response_parse'
  | 'response_validation'
  | 'saving'
  | 'ui_completion'
  | 'analysis_total';

type DevelopmentPerformanceMeasurement = {
  requestId: string | undefined;
  stage: DevelopmentPerformanceStage;
  durationMs?: number;
  imageBytes?: number;
  outcome?: 'ok' | 'failed' | 'fallback';
};

export function developmentPerformanceNow(): number {
  return globalThis.performance?.now() ?? Date.now();
}

export function createDevelopmentRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `dev-${timestamp}-${random}`;
}

export function logDevelopmentPerformance(measurement: DevelopmentPerformanceMeasurement): void {
  if (!__DEV__ || !measurement.requestId) return;
  console.info('[recall-performance]', {
    ...measurement,
    ...(measurement.durationMs === undefined
      ? {}
      : { durationMs: Math.round(measurement.durationMs * 10) / 10 }),
  });
}

export function waitForUiFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
