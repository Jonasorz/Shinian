"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SidebarTagTree } from "./SidebarTagTree";
import {
  CheckSquare,
  Feather,
  LogOut,
  Search,
  Settings,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import type { Memo, Task } from "@/lib/types";
import type { TagWithCount } from "@/lib/tags";
import styles from "@/app/search/search.module.css";

type SearchWorkspaceProps = {
  initialMemos: Memo[];
  initialTasks: Task[];
  initialTags: TagWithCount[];
  username: string;
  initialQuery?: string;
  initialTag?: string;
  initialType?: "all" | "memo" | "task";
};

function HighlightedContent({ content }: { content: string }) {
  const segments = content.split(/(#[\p{L}\p{N}_/-]+)/gu);
  return (
    <>
      {segments.map((segment, index) =>
        segment.startsWith("#") ? (
          <span className={styles.highlightTag} key={`${segment}-${index}`}>
            {segment}
          </span>
        ) : (
          segment
        ),
      )}
    </>
  );
}

function formatDate(isoStr: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoStr));
}

export function SearchWorkspace({
  initialMemos,
  initialTasks,
  initialTags,
  username,
  initialQuery = "",
  initialTag = "",
  initialType = "all",
}: SearchWorkspaceProps) {
  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);
  const [selectedTag, setSelectedTag] = useState<string | null>(
    initialTag || null,
  );
  const [type, setType] = useState<"all" | "memo" | "task">(initialType);

  const [memos, setMemos] = useState<Memo[]>(initialMemos);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [tags] = useState<TagWithCount[]>(initialTags);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (selectedTag) params.set("tag", selectedTag);
        if (type !== "all") params.set("type", type);

        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) return;

        const data = (await res.json()) as { memos: Memo[]; tasks: Task[] };
        if (!cancelled) {
          setMemos(data.memos);
          setTasks(data.tasks);
        }
      } catch {
        // Ignore fetch errors
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, selectedTag, type]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  // Combined and sorted results
  const combinedResults = useMemo(() => {
    const list: Array<
      | { kind: "memo"; item: Memo; date: string }
      | { kind: "task"; item: Task; date: string }
    > = [];

    const memoIdSet = new Set(memos.map((m) => m.id));

    if (type === "all" || type === "memo") {
      memos.forEach((m) =>
        list.push({ kind: "memo", item: m, date: m.createdAt }),
      );
    }
    if (type === "all" || type === "task") {
      tasks.forEach((t) => {
        // If searching all and task was auto-created from a memo present in the list,
        // skip duplicate task card so it renders cleanly as a Memo card.
        if (type === "all" && t.sourceMemoId && memoIdSet.has(t.sourceMemoId)) {
          return;
        }
        list.push({ kind: "task", item: t, date: t.createdAt });
      });
    }

    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [memos, tasks, type]);

  return (
    <div className={styles.shell}>
      {/* Sidebar for Desktop */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">
            拾
          </div>
          <span>Shinian</span>
        </div>

        <nav aria-label="主要导航" className={styles.nav}>
          <Link href="/notes">
            <Feather aria-hidden="true" size={17} strokeWidth={1.7} />
            记录
          </Link>
          <Link href="/tasks">
            <CheckSquare aria-hidden="true" size={17} strokeWidth={1.7} />
            任务
          </Link>
          <Link aria-current="page" className={styles.navActive} href="/search">
            <span className={styles.activeDot} aria-hidden="true" />
            <Search aria-hidden="true" size={17} strokeWidth={1.7} />
            搜索
          </Link>
          <Link href="/review">
            <Sparkles aria-hidden="true" size={17} strokeWidth={1.7} />
            回顾
          </Link>
          <Link href="/settings">
            <Settings aria-hidden="true" size={17} strokeWidth={1.7} />
            设置
          </Link>
        </nav>

        <SidebarTagTree
          activeTag={query}
          onSelectTag={(tag) => setQuery(tag)}
        />

        <div className={styles.sidebarFooter}>
          <div>
            <span>私人空间</span>
            <strong>{username}</strong>
          </div>
          <button aria-label="退出登录" onClick={logout} type="button">
            <LogOut aria-hidden="true" size={17} strokeWidth={1.7} />
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main id="main-content" className={styles.main}>
        {/* Mobile Header Navigation */}
        <header className={styles.mobileHeader}>
          <div className={styles.mobileBrand}>
            <div className={styles.brandMark} aria-hidden="true">
              拾
            </div>
            <span>Shinian</span>
          </div>
          <div className={styles.mobileNav}>
            <a href="/notes">记录</a>
            <a href="/tasks">任务</a>
            <a className={styles.mobileNavActive} href="/search">
              搜索
            </a>
            <a href="/review">回顾</a>
          </div>
          <button aria-label="退出登录" onClick={logout} type="button">
            <LogOut aria-hidden="true" size={18} />
          </button>
        </header>

        <div className={styles.contentColumn}>
          <div className={styles.pageHeader}>
            <p className={styles.eyebrow}>检索</p>
            <h1>全文搜索与标签</h1>
          </div>

          {/* Search Input Bar */}
          <div className={styles.searchBarCard}>
            <Search size={20} style={{ color: "var(--ink-muted)" }} />
            <input
              autoFocus
              className={styles.searchInput}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索卡片内容、任务标题或关键词..."
              type="text"
              value={query}
            />
            {query || selectedTag ? (
              <button
                aria-label="清空搜索"
                className={styles.clearSearchButton}
                onClick={() => {
                  setQuery("");
                  setSelectedTag(null);
                }}
                type="button"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>

          {/* Tag Cloud */}
          {tags.length > 0 ? (
            <section className={styles.tagCloudSection}>
              <div className={styles.tagCloudHeader}>
                <Tag size={14} />
                <span>热门标签 ({tags.length})</span>
              </div>
              <div className={styles.tagCloud}>
                {tags.map((t) => {
                  const isSelected = selectedTag === t.tag;
                  return (
                    <button
                      key={t.tag}
                      className={`${styles.tagChip} ${
                        isSelected ? styles.activeTagChip : ""
                      }`}
                      onClick={() =>
                        setSelectedTag(isSelected ? null : t.tag)
                      }
                      type="button"
                    >
                      {t.tag}
                      <span className={styles.tagCountBadge}>{t.count}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Type Filter Tabs */}
          <div className={styles.typeTabs}>
            <button
              className={`${styles.typeTab} ${
                type === "all" ? styles.activeTypeTab : ""
              }`}
              onClick={() => setType("all")}
              type="button"
            >
              全部 ({combinedResults.length})
            </button>
            <button
              className={`${styles.typeTab} ${
                type === "memo" ? styles.activeTypeTab : ""
              }`}
              onClick={() => setType("memo")}
              type="button"
            >
              仅笔记 ({memos.length})
            </button>
            <button
              className={`${styles.typeTab} ${
                type === "task" ? styles.activeTypeTab : ""
              }`}
              onClick={() => setType("task")}
              type="button"
            >
              仅任务 ({tasks.length})
            </button>
          </div>

          {/* Results List */}
          <section className={styles.resultsList}>
            {isSearching ? (
              <div className={styles.emptyState}>
                <p>正在检索中...</p>
              </div>
            ) : combinedResults.length === 0 ? (
              <div className={styles.emptyState}>
                <Search size={36} strokeWidth={1.2} />
                <p>未找到符合条件的笔记或任务</p>
              </div>
            ) : (
              combinedResults.map(({ kind, item, date }) => {
                if (kind === "memo") {
                  const memo = item as Memo;
                  return (
                    <article key={`memo-${memo.id}`} className={styles.resultCard}>
                      <div className={styles.resultHeader}>
                        <span
                          className={`${styles.resultBadge} ${styles.badgeMemo}`}
                        >
                          <Feather size={12} />
                          Memo 笔记
                        </span>
                        <time className={styles.resultTime}>
                          {formatDate(date)}
                        </time>
                      </div>
                      <p className={styles.resultText}>
                        <HighlightedContent content={memo.content} />
                      </p>
                    </article>
                  );
                } else {
                  const task = item as Task;
                  return (
                    <article key={`task-${task.id}`} className={styles.resultCard}>
                      <div className={styles.resultHeader}>
                        <span
                          className={`${styles.resultBadge} ${styles.badgeTask}`}
                        >
                          <CheckSquare size={12} />
                          Task 任务 · {task.listName}
                        </span>
                        <time className={styles.resultTime}>
                          {formatDate(date)}
                        </time>
                      </div>
                      <h3 className={styles.resultTitle}>
                        <HighlightedContent content={task.title} />
                      </h3>
                      {task.description ? (
                        <p className={styles.resultText}>
                          <HighlightedContent content={task.description} />
                        </p>
                      ) : null}
                    </article>
                  );
                }
              })
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
