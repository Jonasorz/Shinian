import type { TaskPriority, TaskStatus } from "./types";

export type ParsedMemoItem = {
  content: string;
  createdAt?: string;
  attachmentPaths?: string[];
};

export type ParsedTaskItem = {
  title: string;
  description?: string;
  listName?: string;
  dueDate?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
};

export type ImportParseResult = {
  source: "flomo" | "ticktick" | "shinian_json";
  memos: ParsedMemoItem[];
  tasks: ParsedTaskItem[];
  previewStats: {
    memoCount: number;
    taskCount: number;
    attachmentCount: number;
    tagsFound: string[];
    listsFound: string[];
  };
};

/**
 * Parse flomo HTML export content into Memo items.
 */
export function parseFlomoHtml(htmlContent: string): ImportParseResult {
  const memos: ParsedMemoItem[] = [];

  // Match memo cards in flomo HTML format
  // Typical flomo format: <div class="memo"><div class="time">2023-05-20 14:30:00</div><div class="content"><p>text</p></div></div>
  const memoStarts = Array.from(
    htmlContent.matchAll(/<div\s+[^>]*class=["'][^"']*\bmemo\b[^"']*["'][^>]*>/gi),
  );
  const memoBlocks = memoStarts.map((match, index) =>
    htmlContent.slice(
      match.index,
      memoStarts[index + 1]?.index ?? htmlContent.length,
    ),
  );

  if (memoBlocks.length === 0) {
    // Generic fallback: match paragraphs or text blocks containing #tags
    const paragraphMatches = htmlContent.match(/<(p|div)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
    paragraphMatches.forEach((block) => {
      const cleanText = stripHtmlTags(block).trim();
      if (cleanText && cleanText.length > 2) {
        memos.push({ content: cleanText });
      }
    });
  } else {
    memoBlocks.forEach((block) => {
      const timeMatch = block.match(/<div class=["']time["'][^>]*>([\s\S]*?)<\/div>/i);
      const contentMatch = block.match(/<div class=["']content["'][^>]*>([\s\S]*?)<\/div>/i);

      const timeStr = timeMatch ? stripHtmlTags(timeMatch[1]!).trim() : undefined;
      const rawContent = contentMatch ? contentMatch[1]! : block;
      const cleanContent = formatHtmlContentToText(rawContent).trim();
      const attachmentPaths = Array.from(
        block.matchAll(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi),
        (match) => normalizeFlomoAttachmentPath(match[1]!),
      ).filter((path): path is string => Boolean(path));

      if (cleanContent) {
        let createdAt: string | undefined = undefined;
        if (timeStr) {
          const parsedDate = new Date(timeStr.replace(/-/g, "/"));
          if (!isNaN(parsedDate.getTime())) {
            createdAt = parsedDate.toISOString();
          }
        }

        memos.push({
          content: cleanContent,
          createdAt,
          attachmentPaths,
        });
      }
    });
  }

  // Extract all tags found in memos
  const tagsSet = new Set<string>();
  memos.forEach((m) => {
    const found = m.content.match(/#[\p{L}\p{N}_/-]+/gu) || [];
    found.forEach((t) => tagsSet.add(t));
  });

  return {
    source: "flomo",
    memos,
    tasks: [],
    previewStats: {
      memoCount: memos.length,
      taskCount: 0,
      attachmentCount: memos.reduce(
        (count, memo) => count + (memo.attachmentPaths?.length ?? 0),
        0,
      ),
      tagsFound: Array.from(tagsSet),
      listsFound: [],
    },
  };
}

function normalizeFlomoAttachmentPath(source: string): string | null {
  const decoded = (() => {
    try {
      return decodeURIComponent(source);
    } catch {
      return source;
    }
  })();
  const normalized = decoded.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized.startsWith("file/") || normalized.includes("../")) return null;
  return normalized;
}

/**
 * Helper to convert HTML elements (<p>, <br>, <div>) into clean plain text with linebreaks.
 */
function formatHtmlContentToText(html: string): string {
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<div[^>]*>/gi, "");

  return stripHtmlTags(text)
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

/**
 * Parse TickTick (滴答清单) CSV export content into Task items.
 */
export function parseTickTickCsv(csvContent: string): ImportParseResult {
  const tasks: ParsedTaskItem[] = [];
  const lines = parseCsvLines(csvContent);

  if (lines.length <= 1) {
    return {
      source: "ticktick",
      memos: [],
      tasks: [],
      previewStats: { memoCount: 0, taskCount: 0, attachmentCount: 0, tagsFound: [], listsFound: [] },
    };
  }

  const headers = lines[0]!.map((h) => h.trim().toLowerCase());
  const titleIdx = headers.findIndex((h) => h.includes("title") || h.includes("标题") || h.includes("名称"));
  const contentIdx = headers.findIndex((h) => h.includes("content") || h.includes("note") || h.includes("备注") || h.includes("内容"));
  const listIdx = headers.findIndex((h) => h.includes("list") || h.includes("folder") || h.includes("清单") || h.includes("分类"));
  const dueIdx = headers.findIndex((h) => h.includes("due") || h.includes("截止") || h.includes("到期"));
  const priorityIdx = headers.findIndex((h) => h.includes("priority") || h.includes("优先级") || h.includes("优先度"));
  const statusIdx = headers.findIndex((h) => h.includes("status") || h.includes("state") || h.includes("状态") || h.includes("完成"));

  const listsSet = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i]!;
    if (row.length === 0) continue;

    const title = titleIdx !== -1 && row[titleIdx] ? row[titleIdx]!.trim() : (row[0] ? row[0]!.trim() : "");
    if (!title) continue;

    const description = contentIdx !== -1 && row[contentIdx] ? row[contentIdx]!.trim() : "";
    const listName = listIdx !== -1 && row[listIdx] ? row[listIdx]!.trim() : "收件箱";
    if (listName) listsSet.add(listName);

    let dueDate: string | undefined = undefined;
    if (dueIdx !== -1 && row[dueIdx]) {
      const rawDue = row[dueIdx]!.trim();
      const parsedDate = new Date(rawDue);
      if (!isNaN(parsedDate.getTime())) {
        dueDate = parsedDate.toISOString();
      }
    }

    let priority: TaskPriority = "none";
    if (priorityIdx !== -1 && row[priorityIdx]) {
      const p = row[priorityIdx]!.trim().toLowerCase();
      if (p.includes("high") || p.includes("高") || p === "3" || p === "5") priority = "high";
      else if (p.includes("medium") || p.includes("中") || p === "2") priority = "medium";
      else if (p.includes("low") || p.includes("低") || p === "1") priority = "low";
    }

    let status: TaskStatus = "todo";
    if (statusIdx !== -1 && row[statusIdx]) {
      const s = row[statusIdx]!.trim().toLowerCase();
      if (s.includes("done") || s.includes("completed") || s.includes("已完成") || s === "2" || s === "1") {
        status = "done";
      }
    }

    tasks.push({
      title,
      description,
      listName: listName || "收件箱",
      dueDate,
      priority,
      status,
    });
  }

  return {
    source: "ticktick",
    memos: [],
    tasks,
    previewStats: {
      memoCount: 0,
      taskCount: tasks.length,
      attachmentCount: 0,
      tagsFound: [],
      listsFound: Array.from(listsSet),
    },
  };
}

/**
 * Robust CSV parser handling quotes and escaped commas.
 */
function parseCsvLines(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]!;
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.some((field) => field.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((field) => field.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parse Shinian JSON backup format.
 */
export function parseShinianJson(jsonContent: string): ImportParseResult {
  const data = JSON.parse(jsonContent);
  const memos: ParsedMemoItem[] = [];
  const tasks: ParsedTaskItem[] = [];

  if (Array.isArray(data.memos)) {
    data.memos.forEach((m: { content: string; createdAt?: string }) => {
      if (m.content) {
        memos.push({ content: m.content, createdAt: m.createdAt });
      }
    });
  }

  if (Array.isArray(data.tasks)) {
    data.tasks.forEach(
      (t: {
        title: string;
        description?: string;
        listName?: string;
        dueDate?: string;
        priority?: TaskPriority;
        status?: TaskStatus;
      }) => {
        if (t.title) {
          tasks.push({
            title: t.title,
            description: t.description,
            listName: t.listName,
            dueDate: t.dueDate,
            priority: t.priority,
            status: t.status,
          });
        }
      },
    );
  }

  const tagsSet = new Set<string>();
  memos.forEach((m) => {
    const found = m.content.match(/#[\p{L}\p{N}_/-]+/gu) || [];
    found.forEach((t) => tagsSet.add(t));
  });

  const listsSet = new Set<string>();
  tasks.forEach((t) => {
    if (t.listName) listsSet.add(t.listName);
  });

  return {
    source: "shinian_json",
    memos,
    tasks,
    previewStats: {
      memoCount: memos.length,
      taskCount: tasks.length,
      attachmentCount: 0,
      tagsFound: Array.from(tagsSet),
      listsFound: Array.from(listsSet),
    },
  };
}
