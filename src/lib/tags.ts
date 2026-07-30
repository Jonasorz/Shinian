/**
 * Extract all unique #tags and #parent/child tags from text content.
 * Removes trailing punctuation marks like '.', ',', '!', '?', etc.
 */
export function extractTags(content: string): string[] {
  if (!content) return [];

  // Match #tag or #parent/subtag
  const matches = content.match(/#[\p{L}\p{N}_/-]+/gu);
  if (!matches) return [];

  const cleanTags = matches.map((rawTag) => {
    // Strip trailing punctuation if accidentally captured
    return rawTag.replace(/[.,!?;:)]+$/, "");
  });

  // Return unique tags maintaining order
  return Array.from(new Set(cleanTags));
}

/**
 * Format tag name to ensure leading '#' is present
 */
export function formatTag(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export type TagWithCount = {
  tag: string;
  count: number;
};

export interface TagNode {
  name: string;
  fullTag: string;
  count: number;
  children: TagNode[];
}

export const SYSTEM_TASK_TAGS = new Set([
  "#任务",
  "#待办",
  "#todo",
  "#task",
]);

export function isSystemTaskTag(tag: string): boolean {
  const clean = tag.trim().toLowerCase();
  const formatted = clean.startsWith("#") ? clean : `#${clean}`;
  return SYSTEM_TASK_TAGS.has(formatted);
}

/**
 * Builds a hierarchical tag tree from a list of tags (e.g. #工作/项目A -> 工作 > 项目A)
 * Automatically excludes system task tags like #任务 and #待办 from the category tree.
 */
export function buildTagTree(tags: TagWithCount[]): TagNode[] {
  const rootNodes: TagNode[] = [];
  const nodeMap = new Map<string, TagNode>();

  const categoryTags = tags.filter(
    (t) => t.tag !== "#无标签" && t.tag !== "无标签",
  );

  for (const { tag, count } of categoryTags) {
    const raw = tag.startsWith("#") ? tag.slice(1) : tag;
    const parts = raw.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    let currentPath = "";
    let parentChildren = rootNodes;

    for (let i = 0; i < parts.length; i++) {
      const partName = parts[i];
      currentPath = currentPath ? `${currentPath}/${partName}` : partName;
      const fullTag = `#${currentPath}`;

      let node = nodeMap.get(fullTag);
      if (!node) {
        node = {
          name: partName,
          fullTag,
          count: 0,
          children: [],
        };
        nodeMap.set(fullTag, node);
        parentChildren.push(node);
      }

      if (i === parts.length - 1) {
        node.count = Math.max(node.count, count);
      }

      parentChildren = node.children;
    }
  }

  function aggregate(node: TagNode): number {
    let childSum = 0;
    for (const child of node.children) {
      childSum += aggregate(child);
    }
    node.count = Math.max(node.count, childSum);
    return node.count;
  }

  for (const root of rootNodes) {
    aggregate(root);
  }

  function sortNodes(nodes: TagNode[]) {
    nodes.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    for (const n of nodes) {
      sortNodes(n.children);
    }
  }

  sortNodes(rootNodes);
  return rootNodes;
}
