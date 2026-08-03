export function canSubmitMemo(
  draft: string,
  pendingImageCount: number,
): boolean {
  return draft.trim().length > 0 || pendingImageCount > 0;
}

export function memoContentForSubmission(
  draft: string,
  pendingImageCount: number,
): string {
  const content = draft.trim();
  return content || (pendingImageCount > 0 ? "图片" : "");
}
