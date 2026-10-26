export interface PlatformEditorListener {
  onEdit(): void;
  onDetach(): void;
}

export interface PreviewLayout {
  container: HTMLElement;
  heightTarget?: HTMLElement;
}

export type WritingContext = 'post' | 'reply' | 'quote' | 'unknown';

export interface PlatformAdapter {
  readonly id: string;
  readonly replacementErrorMessage: string;
  matches(location: Location): boolean;
  findEditor(target: EventTarget | null): HTMLElement | null;
  writingContext(editor: HTMLElement): WritingContext;
  getText(editor: HTMLElement): string;
  replaceText(editor: HTMLElement, source: string, translation: string, canReplace?: () => boolean): Promise<boolean>;
  observe(editor: HTMLElement, listener: PlatformEditorListener): () => void;
  previewLayout(editor: HTMLElement): PreviewLayout;
}
