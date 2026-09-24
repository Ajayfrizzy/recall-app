export type ScreenshotImageStatus = 'loading' | 'loaded' | 'error' | 'unavailable';

export type ScreenshotImageState = {
  sourceKey: string;
  status: ScreenshotImageStatus;
};

export type ScreenshotImageEvent = 'load_start' | 'load' | 'error';

export function screenshotImageSourceKey(uri: string | null | undefined): string {
  return typeof uri === 'string' ? uri.trim() : '';
}

export function createScreenshotImageState(uri: string | null | undefined): ScreenshotImageState {
  const sourceKey = screenshotImageSourceKey(uri);
  return { sourceKey, status: sourceKey ? 'loading' : 'unavailable' };
}

export function transitionScreenshotImageState(
  uri: string | null | undefined,
  event: ScreenshotImageEvent,
): ScreenshotImageState {
  const sourceKey = screenshotImageSourceKey(uri);
  if (!sourceKey) return { sourceKey, status: 'unavailable' };
  if (event === 'load') return { sourceKey, status: 'loaded' };
  if (event === 'error') return { sourceKey, status: 'error' };
  return { sourceKey, status: 'loading' };
}
