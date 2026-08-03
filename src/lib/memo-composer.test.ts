import { describe, expect, it } from "vitest";
import { canSubmitMemo, memoContentForSubmission } from "./memo-composer";

describe("memo composer submission", () => {
  it("allows text-only and image-only records but rejects an empty composer", () => {
    expect(canSubmitMemo("一条记录", 0)).toBe(true);
    expect(canSubmitMemo("", 1)).toBe(true);
    expect(canSubmitMemo("   ", 0)).toBe(false);
  });

  it("uses a stable caption for image-only records", () => {
    expect(memoContentForSubmission("", 1)).toBe("图片");
    expect(memoContentForSubmission("  自定义说明  ", 1)).toBe("自定义说明");
  });
});
