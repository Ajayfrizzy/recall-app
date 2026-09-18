import { Platform } from 'react-native';

import { OcrError, type OcrResult } from './types';

export type { OcrBlock, OcrBoundingBox, OcrErrorCode, OcrResult } from './types';
export { OcrError } from './types';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function recognizeScreenshotText(uri: string): Promise<OcrResult> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    throw new OcrError('unsupported_platform', 'OCR is only available on Android and iOS.');
  }

  try {
    // The dynamic import keeps the native provider behind this service boundary.
    const { recognizeText } = await import('expo-ocr-kit');
    const result = await recognizeText(uri);
    return {
      text: result.text?.trim() ?? '',
      blocks: (result.blocks ?? []).map((block) => ({
        text: block.text,
        boundingBox: block.boundingBox,
      })),
    };
  } catch (error) {
    const message = errorMessage(error);
    if (/not available|development build|expo go/i.test(message)) {
      throw new OcrError('module_unavailable', message, { cause: error });
    }
    if (/image|uri|file|decode|bitmap/i.test(message)) {
      throw new OcrError('image_load_failed', message, { cause: error });
    }
    throw new OcrError('recognition_failed', message, { cause: error });
  }
}
