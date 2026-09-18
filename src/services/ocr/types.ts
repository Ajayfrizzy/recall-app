export interface OcrBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrBlock {
  text: string;
  boundingBox?: OcrBoundingBox;
}

export interface OcrResult {
  text: string;
  blocks: OcrBlock[];
}

export type OcrErrorCode =
  'unsupported_platform' | 'module_unavailable' | 'image_load_failed' | 'recognition_failed';

export class OcrError extends Error {
  constructor(
    public readonly code: OcrErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'OcrError';
  }
}
