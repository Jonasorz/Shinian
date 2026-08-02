import { describe, expect, it } from "vitest";
import {
  createObsidianExportZip,
  generateFullJsonExport,
  generateMemoMarkdown,
  generateTaskMarkdown,
} from "./export";
import type { Memo, Task } from "./types";

const mockMemo: Memo = {
  id: "memo-1234-5678",
  content: "关于 #个人系统 项目的构想与 #架构 笔记",
  createdAt: "2026-07-28T10:00:00.000Z",
  updatedAt: "2026-07-28T10:00:00.000Z",
  deletedAt: null,
  attachments: [],
};

const mockTask: Task = {
  id: "task-1111-2222",
  title: "部署 Shinian 到 Vercel",
  description: "连接 Neon PostgreSQL",
  status: "todo",
  priority: "high",
  listName: "工作",
  startDate: null,
  dueDate: "2026-07-30T00:00:00.000Z",
  reminderAt: null,
  recurrenceRule: "none",
  completedAt: null,
  sourceMemoId: "memo-1234-5678",
  createdAt: "2026-07-28T10:00:00.000Z",
  updatedAt: "2026-07-28T10:00:00.000Z",
  deletedAt: null,
};

describe("export utility", () => {
  it("generates valid YAML Frontmatter for Memo Markdown", () => {
    const md = generateMemoMarkdown(mockMemo);
    expect(md).toContain('id: "memo-1234-5678"');
    expect(md).toContain('- "个人系统"');
    expect(md).toContain('- "架构"');
    expect(md).toContain("关于 #个人系统 项目的构想");
  });

  it("generates Obsidian Tasks compatible Markdown", () => {
    const taskMd = generateTaskMarkdown([mockTask], "工作");
    expect(taskMd).toContain("# 清单：工作");
    expect(taskMd).toContain("- [ ] 部署 Shinian 到 Vercel 📅 2026-07-30 ⏫");
    expect(taskMd).toContain("来源笔记: [[memo_memo-1234-5678]]");
  });

  it("generates structured JSON export", () => {
    const jsonStr = generateFullJsonExport([mockMemo], [mockTask]);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.app).toBe("Shinian");
    expect(parsed.memos.length).toBe(1);
    expect(parsed.tasks.length).toBe(1);
  });

  it("builds a valid non-empty ZIP buffer", () => {
    const zipBytes = createObsidianExportZip([mockMemo], [mockTask]);
    expect(zipBytes).toBeInstanceOf(Uint8Array);
    expect(zipBytes.length).toBeGreaterThan(100);
  });
});
