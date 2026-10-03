export interface TranslationRequest {
  source: string;
  target: string;
  signal: AbortSignal;
  activated: boolean;
  onProgress: (progress: number) => void;
}

export interface TranslationProvider {
  readonly id: string;
  downloadProgressText(progress: number): string;
  translate(text: string, request: TranslationRequest): Promise<string>;
  dispose(): void;
}

export class TranslationError extends Error {
  constructor(public readonly kind: 'unsupported' | 'enable' | 'error', message: string) {
    super(message);
  }
}
