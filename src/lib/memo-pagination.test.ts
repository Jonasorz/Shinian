import { describe, expect, it } from "vitest";
import {
  decodeMemoCursor,
  encodeMemoCursor,
  normalizeMemoPageSize,
} from "./memo-pagination";

describe("memo pagination", () => {
  it("keeps the first page small on mobile and clamps abusive limits", () => {
    expect(normalizeMemoPageSize(null)).toBe(30);
    expect(normalizeMemoPageSize("12")).toBe(12);
    expect(normalizeMemoPageSize("500")).toBe(50);
    expect(normalizeMemoPageSize("invalid")).toBe(30);
  });

  it("round-trips a stable created-at and id cursor", () => {
    const cursor = {
      createdAt: "2026-08-03T01:02:03.000Z",
      id: "2ed64279-7bbd-4c92-ae29-fd129a0ec927",
    };

    expect(decodeMemoCursor(encodeMemoCursor(cursor))).toEqual(cursor);
    expect(decodeMemoCursor("broken-cursor")).toBeNull();
  });
});
