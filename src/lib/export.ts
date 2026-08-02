import { strToU8, zipSync } from "fflate";
import { extractTags } from "./tags";
import type { Memo, Task } from "./types";

/**
 * Format a Memo object into an Obsidian-compatible Markdown file with YAML Frontmatter.
 */
export function generateMemoMarkdown(memo: Memo): string {
  const tags = extractTags(memo.content).map((t) => t.replace(/^#/, ""));

  const yamlLines = [
    "---",
    `id: "${memo.id}"`,
    `created: "${memo.createdAt}"`,
    `updated: "${memo.updatedAt}"`,
  ];

  if (tags.length > 0) {
    yamlLines.push("tags:");
    tags.forEach((tag) => yamlLines.push(`  - "${tag}"`));
  } else {
    yamlLines.push("tags: []");
  }

  yamlLines.push('source: "shinian"');
  yamlLines.push("---", "");

  const attachmentLines = memo.attachments.map((attachment) => {
    const safeName = attachment.filename.replace(/[/\\?%*:|"<>]/g, "_");
    return `![[Attachments/${attachment.id}_${safeName}]]`;
  });
  const attachments = attachmentLines.length
    ? `\n\n${attachmentLines.join("\n")}`
    : "";
  return `${yamlLines.join("\n")}${memo.content}${attachments}\n`;
}

/**
 * Format a list of tasks into an Obsidian Tasks plugin compatible Markdown file.
 */
export function generateTaskMarkdown(tasks: Task[], listName: string): string {
  const lines = [`# 清单：${listName}`, ""];

  if (tasks.length === 0) {
    lines.push("*(暂无任务)*");
    return lines.join("\n");
  }

  tasks.forEach((task) => {
    const isDone = task.status === "done";
    const checkbox = isDone ? "[x]" : "[ ]";
    const dateTag = task.dueDate
      ? ` 📅 ${task.dueDate.split("T")[0]}`
      : "";
    const priorityTag =
      task.priority === "high"
        ? " ⏫"
        : task.priority === "medium"
        ? " 🔼"
        : task.priority === "low"
        ? " 🔽"
        : "";

    lines.push(`- ${checkbox} ${task.title}${dateTag}${priorityTag}`);
    lines.push(`  - ID: ${task.id}`);
    if (task.description) {
      lines.push(`  - 备注: ${task.description.replace(/\n/g, " ")}`);
    }
    if (task.sourceMemoId) {
      lines.push(`  - 来源笔记: [[memo_${task.sourceMemoId}]]`);
    }
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Generate full JSON backup structure.
 */
export function generateFullJsonExport(memos: Memo[], tasks: Task[]): string {
  return JSON.stringify(
    {
      app: "Shinian",
      version: "0.2.0",
      exportedAt: new Date().toISOString(),
      stats: {
        memoCount: memos.length,
        taskCount: tasks.length,
      },
      memos,
      tasks,
    },
    null,
    2,
  );
}

/**
 * Build a ZIP file containing the Obsidian Markdown vault structure and full JSON backup.
 */
export type ExportAttachmentFile = {
  path: string;
  bytes: Uint8Array;
};

export function createObsidianExportZip(
  memos: Memo[],
  tasks: Task[],
  attachmentFiles: ExportAttachmentFile[] = [],
): Uint8Array {
  const files: Record<string, Uint8Array> = {};

  // 1. Pack Memos into Memos/ directory
  memos.forEach((memo) => {
    const datePrefix = memo.createdAt.split("T")[0] ?? "memo";
    const shortId = memo.id.slice(0, 8);
    const fileName = `Memos/${datePrefix}_${shortId}.md`;
    files[fileName] = strToU8(generateMemoMarkdown(memo));
  });

  // 2. Group tasks by listName and pack into Tasks/ directory
  const tasksByList = new Map<string, Task[]>();
  tasks.forEach((task) => {
    const list = task.listName || "收件箱";
    const existing = tasksByList.get(list) ?? [];
    existing.push(task);
    tasksByList.set(list, existing);
  });

  tasksByList.forEach((listTasks, listName) => {
    const safeListName = listName.replace(/[/\\?%*:|"<>]/g, "_");
    const fileName = `Tasks/${safeListName}.md`;
    files[fileName] = strToU8(generateTaskMarkdown(listTasks, listName));
  });

  // 3. Include full JSON backup
  files["shinian_backup.json"] = strToU8(generateFullJsonExport(memos, tasks));

  for (const attachment of attachmentFiles) {
    files[`Attachments/${attachment.path}`] = attachment.bytes;
  }

  return zipSync(files, { level: 6 });
}
