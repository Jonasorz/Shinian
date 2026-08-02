import { describe, expect, it } from "vitest";
import { nextOccurrence } from "./recurrence";

describe("nextOccurrence", () => {
  it("keeps Shanghai wall-clock time for a daily task", () => {
    expect(nextOccurrence("2026-08-02T01:30:00.000Z", "daily")).toBe(
      "2026-08-03T01:30:00.000Z",
    );
  });

  it("skips weekends for workday recurrence", () => {
    expect(nextOccurrence("2026-08-07T01:00:00.000Z", "workday")).toBe(
      "2026-08-10T01:00:00.000Z",
    );
  });

  it("clamps monthly recurrence to the end of month", () => {
    expect(nextOccurrence("2026-01-31T02:00:00.000Z", "monthly")).toBe(
      "2026-02-28T02:00:00.000Z",
    );
  });

  it("clamps leap day for yearly recurrence", () => {
    expect(nextOccurrence("2024-02-29T02:00:00.000Z", "yearly")).toBe(
      "2025-02-28T02:00:00.000Z",
    );
  });
});
