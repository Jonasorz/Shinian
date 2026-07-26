import { describe, expect, it } from "vitest";
import {
  createMemoSchema,
  loginSchema,
  updateMemoSchema,
} from "./validation";

describe("memo validation", () => {
  it("trims valid memo content", () => {
    const result = createMemoSchema.parse({ content: "  记下这一刻  " });
    expect(result.content).toBe("记下这一刻");
  });

  it("rejects empty memo content", () => {
    expect(createMemoSchema.safeParse({ content: "   " }).success).toBe(false);
  });

  it("accepts a restore-only update", () => {
    expect(updateMemoSchema.safeParse({ restore: true }).success).toBe(true);
  });
});

describe("login validation", () => {
  it("requires both credentials", () => {
    expect(loginSchema.safeParse({ username: "", password: "" }).success).toBe(
      false,
    );
  });
});

