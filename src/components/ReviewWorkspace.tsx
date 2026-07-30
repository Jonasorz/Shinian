"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SidebarTagTree } from "./SidebarTagTree";
import {
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Feather,
  LogOut,
  PencilLine,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Memo } from "@/lib/types";
import styles from "@/app/review/review.module.css";

type ReviewWorkspaceProps = {
  initialMemos: Memo[];
  initialYearAgoMemos: Memo[];
  username: string;
};

function formatDate(isoStr: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(isoStr));
}

function MemoContent({ content }: { content: string }) {
  const segments = content.split(/(#[\p{L}\p{N}_/-]+)/gu);
  return (
    <>
      {segments.map((segment, index) =>
        segment.startsWith("#") ? (
          <a
            key={`${segment}-${index}`}
            className={styles.inlineTag}
            href={`/search?tag=${encodeURIComponent(segment)}`}
          >
            {segment}
          </a>
        ) : (
          segment
        ),
      )}
    </>
  );
}

export function ReviewWorkspace({
  initialMemos,
  initialYearAgoMemos,
  username,
}: ReviewWorkspaceProps) {
  const router = useRouter();

  const [memos, setMemos] = useState<Memo[]>(initialMemos);
  const [yearAgoMemos, setYearAgoMemos] =
    useState<Memo[]>(initialYearAgoMemos);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [busyMemoId, setBusyMemoId] = useState<string | null>(null);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/review");
      if (!res.ok) throw new Error("刷新失败");

      const data = (await res.json()) as {
        memos: Memo[];
        yearAgoMemos: Memo[];
      };
      setMemos(data.memos);
      if (data.yearAgoMemos.length > 0) {
        setYearAgoMemos(data.yearAgoMemos);
      }
      setNotice("已为您更换一组回顾笔记");
      setTimeout(() => setNotice(""), 1600);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "无法刷新");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function convertMemoToTask(memo: Memo) {
    const lines = memo.content.trim().split("\n");
    const title = lines[0]?.trim() ?? "无标题任务";
    const description = lines.slice(1).join("\n").trim();

    setBusyMemoId(memo.id);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          sourceMemoId: memo.id,
        }),
      });

      if (!res.ok) throw new Error("转化失败");

      setNotice("已成功将该回顾笔记转化为任务！");
      setTimeout(() => setNotice(""), 1800);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "无法转为任务");
    } finally {
      setBusyMemoId(null);
    }
  }

  function startEditing(memo: Memo) {
    setEditingId(memo.id);
    setEditContent(memo.content);
  }

  async function saveEdit(id: string) {
    if (!editContent.trim()) return;

    setBusyMemoId(id);
    try {
      const res = await fetch(`/api/memos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (!res.ok) throw new Error("保存失败");

      const data = (await res.json()) as { memo: Memo };
      setMemos((prev) => prev.map((m) => (m.id === id ? data.memo : m)));
      setYearAgoMemos((prev) =>
        prev.map((m) => (m.id === id ? data.memo : m)),
      );

      setEditingId(null);
      setNotice("修改已保存");
      setTimeout(() => setNotice(""), 1400);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "保存修改失败");
    } finally {
      setBusyMemoId(null);
    }
  }

  async function deleteMemo(id: string) {
    setBusyMemoId(id);
    try {
      const res = await fetch(`/api/memos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");

      setMemos((prev) => prev.filter((m) => m.id !== id));
      setYearAgoMemos((prev) => prev.filter((m) => m.id !== id));
      setNotice("记录已移除");
      setTimeout(() => setNotice(""), 1400);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusyMemoId(null);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

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
          <Link href="/search">
            <Search aria-hidden="true" size={17} strokeWidth={1.7} />
            搜索
          </Link>
          <Link aria-current="page" className={styles.navActive} href="/review">
            <span className={styles.activeDot} aria-hidden="true" />
            <Sparkles aria-hidden="true" size={17} strokeWidth={1.7} />
            回顾
          </Link>
          <Link href="/settings">
            <Settings aria-hidden="true" size={17} strokeWidth={1.7} />
            设置
          </Link>
        </nav>

        <SidebarTagTree />

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
            <a href="/search">搜索</a>
            <a className={styles.mobileNavActive} href="/review">
              回顾
            </a>
            <a href="/settings">设置</a>
          </div>
          <button aria-label="退出登录" onClick={logout} type="button">
            <LogOut aria-hidden="true" size={18} />
          </button>
        </header>

        <div className={styles.contentColumn}>
          <div className={styles.pageHeader}>
            <div>
              <p className={styles.eyebrow}>沉淀</p>
              <h1>每日回顾</h1>
            </div>
            <button
              className={styles.refreshButton}
              disabled={isRefreshing}
              onClick={handleRefresh}
              type="button"
            >
              <RefreshCw
                size={14}
                style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }}
              />
              换一组
            </button>
          </div>

          {notice ? (
            <div className={styles.notice} aria-live="polite">
              {notice}
            </div>
          ) : null}

          {/* Year Ago Today Section */}
          {yearAgoMemos.length > 0 ? (
            <section className={styles.yearAgoBanner}>
              <div className={styles.yearAgoHeader}>
                <Clock size={16} />
                <span>去年今日的思考 ({yearAgoMemos.length})</span>
              </div>
              <div className={styles.reviewGrid}>
                {yearAgoMemos.map((memo) => (
                  <article key={`year-${memo.id}`} className={styles.memoCard}>
                    <div className={styles.memoTop}>
                      <time>{formatDate(memo.createdAt)}</time>
                      <span>1年前的今天</span>
                    </div>
                    <div className={styles.memoContent}>
                      <MemoContent content={memo.content} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {/* Random Review Section */}
          <div className={styles.sectionTitle}>
            <Sparkles size={18} style={{ color: "var(--accent)" }} />
            <span>灵感推演 · 随机旧笔记</span>
          </div>

          <section className={styles.reviewGrid}>
            {memos.length === 0 ? (
              <div className={styles.emptyState}>
                <Calendar size={36} strokeWidth={1.2} />
                <p>暂无需要回顾的笔记，快去记录新想法吧</p>
              </div>
            ) : (
              memos.map((memo) => {
                const isEditing = editingId === memo.id;
                return (
                  <article key={memo.id} className={styles.memoCard}>
                    <div className={styles.memoTop}>
                      <time>{formatDate(memo.createdAt)}</time>
                    </div>

                    {isEditing ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <textarea
                          onChange={(e) => setEditContent(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "var(--radius-control)",
                            border: "1px solid var(--divider)",
                            fontSize: "14px",
                            fontFamily: "var(--font-reading)",
                            outline: "none",
                            resize: "vertical",
                            minHeight: "72px",
                          }}
                          value={editContent}
                        />
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "8px",
                          }}
                        >
                          <button
                            onClick={() => setEditingId(null)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              border: "1px solid var(--divider)",
                              background: "transparent",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                            type="button"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => void saveEdit(memo.id)}
                            style={{
                              padding: "4px 12px",
                              borderRadius: "6px",
                              border: "none",
                              background: "var(--accent)",
                              color: "white",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                            type="button"
                          >
                            <Check size={13} />
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.memoContent}>
                        <MemoContent content={memo.content} />
                      </div>
                    )}

                    {!isEditing ? (
                      <div className={styles.memoActions}>
                        <button
                          className={styles.actionButton}
                          disabled={busyMemoId === memo.id}
                          onClick={() => void convertMemoToTask(memo)}
                          type="button"
                        >
                          <CheckSquare size={14} />
                          转为任务
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => startEditing(memo)}
                          type="button"
                        >
                          <PencilLine size={14} />
                          编辑
                        </button>
                        <button
                          className={styles.actionButton}
                          disabled={busyMemoId === memo.id}
                          onClick={() => void deleteMemo(memo.id)}
                          type="button"
                        >
                          <Trash2 size={14} />
                          删除
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
