"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Hash, Tag } from "lucide-react";
import { buildTagTree, TagNode, TagWithCount } from "@/lib/tags";
import styles from "./SidebarTagTree.module.css";

interface SidebarTagTreeProps {
  activeTag?: string;
  onSelectTag?: (tag: string) => void;
}

// In-memory module cache for tags across page navigations
let cachedTags: TagWithCount[] | null = null;
let cachedExpandedPaths: Record<string, boolean> | null = null;

export function SidebarTagTree({
  activeTag,
  onSelectTag,
}: SidebarTagTreeProps) {
  const [tags, setTags] = useState<TagWithCount[]>(() => cachedTags || []);
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>(
    () => cachedExpandedPaths || {},
  );
  const [loading, setLoading] = useState(() => !cachedTags);

  useEffect(() => {
    let isMounted = true;
    async function fetchTags() {
      try {
        const res = await fetch("/api/tags");
        if (!res.ok) return;
        const data = (await res.json()) as { tags: TagWithCount[] };
        if (isMounted && Array.isArray(data.tags)) {
          cachedTags = data.tags;
          setTags(data.tags);
          
          if (!cachedExpandedPaths) {
            const defaultExpanded: Record<string, boolean> = {};
            const tree = buildTagTree(data.tags);
            for (const node of tree) {
              defaultExpanded[node.fullTag] = true;
            }
            cachedExpandedPaths = defaultExpanded;
            setExpandedPaths(defaultExpanded);
          }
        }
      } catch {
        // ignore fetch failure gracefully
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void fetchTags();
    return () => {
      isMounted = false;
    };
  }, []);

  const tree = buildTagTree(tags);

  function toggleExpand(fullTag: string, e: React.MouseEvent) {
    e.stopPropagation();
    setExpandedPaths((prev) => ({
      ...prev,
      [fullTag]: !prev[fullTag],
    }));
  }

  function handleTagClick(fullTag: string) {
    if (onSelectTag) {
      onSelectTag(fullTag);
    } else {
      window.location.href = `/search?q=${encodeURIComponent(fullTag)}`;
    }
  }

  const untaggedItem = tags.find(
    (t) => t.tag === "#无标签" || t.tag === "无标签",
  );
  const isUntaggedActive =
    activeTag === "#无标签" || activeTag === "无标签";

  return (
    <div className={styles.tagSection}>
      <div className={styles.sectionHeader}>
        <Tag size={13} className={styles.headerIcon} />
        <span>标签库</span>
        {loading ? null : (
          <span className={styles.tagTotalBadge}>{tags.length}</span>
        )}
      </div>

      <div className={styles.treeContainer}>
        {loading ? (
          <div
            style={{
              padding: "8px 10px",
              fontSize: "12px",
              color: "var(--ink-muted)",
              opacity: 0.6,
            }}
          >
            加载中…
          </div>
        ) : (
          <>
            {untaggedItem ? (
              <div
                className={`${styles.nodeRow} ${
                  isUntaggedActive ? styles.nodeActive : ""
                }`}
                onClick={() => handleTagClick("#无标签")}
                style={{ paddingLeft: "8px" }}
              >
                <span className={styles.togglePlaceholder} />
                <Hash
                  size={12}
                  className={styles.hashIcon}
                  style={{ opacity: 0.5 }}
                />
                <span className={styles.nodeName}>无标签</span>
                <span className={styles.nodeCount}>{untaggedItem.count}</span>
              </div>
            ) : null}

            {tree.length === 0 && !untaggedItem ? (
              <div
                style={{
                  padding: "8px 10px",
                  fontSize: "12px",
                  color: "var(--ink-muted)",
                  opacity: 0.6,
                }}
              >
                暂无标签
              </div>
            ) : (
              tree.map((node) => (
                <TreeNodeItem
                  key={node.fullTag}
                  activeTag={activeTag}
                  expandedPaths={expandedPaths}
                  node={node}
                  onSelectTag={handleTagClick}
                  onToggleExpand={toggleExpand}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TreeNodeItem({
  node,
  expandedPaths,
  activeTag,
  onToggleExpand,
  onSelectTag,
  depth = 0,
}: {
  node: TagNode;
  expandedPaths: Record<string, boolean>;
  activeTag?: string;
  onToggleExpand: (fullTag: string, e: React.MouseEvent) => void;
  onSelectTag: (fullTag: string) => void;
  depth?: number;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedPaths[node.fullTag] ?? true;
  const isActive = activeTag === node.fullTag;

  return (
    <div className={styles.nodeWrapper}>
      <div
        className={`${styles.nodeRow} ${isActive ? styles.nodeActive : ""}`}
        onClick={() => onSelectTag(node.fullTag)}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {hasChildren ? (
          <button
            className={styles.toggleBtn}
            onClick={(e) => onToggleExpand(node.fullTag, e)}
            type="button"
          >
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span className={styles.togglePlaceholder} />
        )}

        <Hash size={12} className={styles.hashIcon} />
        <span className={styles.nodeName}>{node.name}</span>
        <span className={styles.nodeCount}>{node.count}</span>
      </div>

      {hasChildren && isExpanded ? (
        <div className={styles.childrenContainer}>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.fullTag}
              activeTag={activeTag}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              node={child}
              onSelectTag={onSelectTag}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
