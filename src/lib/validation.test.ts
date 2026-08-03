import { describe, expect, it } from "vitest";
import {
  createMemoSchema,
  createTaskSchema,
  loginSchema,
  updateMemoSchema,
  updateTaskSchema,
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

describe("task validation", () => {
  it("validates and applies defaults for task creation", () => {
    const result = createTaskSchema.parse({ title: "  完成 MVP 开发  " });
    expect(result.title).toBe("完成 MVP 开发");
    expect(result.listName).toBe("收件箱");
    expect(result.priority).toBe("none");
    expect(result.recurrenceRule).toBe("none");
  });

  it("rejects empty task title", () => {
    expect(createTaskSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  it("validates task update fields", () => {
    const result = updateTaskSchema.parse({
      status: "done",
      priority: "high",
    });
    expect(result.status).toBe("done");
    expect(result.priority).toBe("high");
  });
});
