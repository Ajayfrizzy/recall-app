import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  developmentPerformanceNow,
  logDevelopmentPerformance,
} from '@/services/development-performance';

const MAX_LONG_EDGE = 1800;
const JPEG_QUALITY = 0.85;

export interface PreparedScreenshot {
  uri: string;
  imageDataUrl: string;
  width: number;
  height: number;
}

export async function prepareScreenshotForAnalysis(
  uri: string,
  dimensions: { width: number; height: number },
  requestId?: string,
): Promise<PreparedScreenshot> {
  const startedAt = developmentPerformanceNow();
  try {
    const context = ImageManipulator.manipulate(uri);
    const longEdge = Math.max(dimensions.width, dimensions.height);

    if (longEdge > MAX_LONG_EDGE) {
      if (dimensions.width >= dimensions.height) context.resize({ width: MAX_LONG_EDGE });
      else context.resize({ height: MAX_LONG_EDGE });
    }

    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      base64: true,
      compress: JPEG_QUALITY,
      format: SaveFormat.JPEG,
    });
    if (!result.base64) throw new Error('Screenshot preparation did not produce image data.');

    logDevelopmentPerformance({
      requestId,
      stage: 'image_preparation',
      durationMs: developmentPerformanceNow() - startedAt,
      outcome: 'ok',
    });

    return {
      uri: result.uri,
      imageDataUrl: `data:image/jpeg;base64,${result.base64}`,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    logDevelopmentPerformance({
      requestId,
      stage: 'image_preparation',
      durationMs: developmentPerformanceNow() - startedAt,
      outcome: 'failed',
    });
    throw error;
  }
}
