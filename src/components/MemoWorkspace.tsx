"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckSquare,
  Feather,
  LogOut,
  PencilLine,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import type { Memo } from "@/lib/types";
import styles from "@/app/notes/notes.module.css";

const DRAFT_KEY = "shinian.memo.draft";
const MAX_CONTENT_LENGTH = 5000;

type MemoGroup = {
  key: string;
  label: string;
  memos: Memo[];
};

type UndoState = {
  memo: Memo;
};

function localDateKey(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function dayLabel(key: string): string {
  const today = localDateKey(new Date().toISOString());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateKey(yesterdayDate.toISOString());

  if (key === today) {
    return "今天";
  }
  if (key === yesterday) {
    return "昨天";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${key}T12:00:00+08:00`));
}

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function sortMemos(memos: Memo[]): Memo[] {
  return [...memos].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() -
      new Date(left.createdAt).getTime(),
  );
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

async function apiRequest<T>(
  input: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "请求没有完成");
  }
  return data;
}

export function MemoWorkspace({
  initialMemos,
  username,
}: {
  initialMemos: Memo[];
  username: string;
}) {
  const router = useRouter();
  const [memos, setMemos] = useState(() => sortMemos(initialMemos));
  const [draft, setDraft] = useState("");
  const [composerError, setComposerError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const [busyMemoId, setBusyMemoId] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [notice, setNotice] = useState("");
  const [newMemoId, setNewMemoId] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedDraft = window.localStorage.getItem(DRAFT_KEY);
      if (storedDraft) {
        setDraft(storedDraft);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, draft);
  }, [draft]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const groups = useMemo<MemoGroup[]>(() => {
    const grouped = new Map<string, Memo[]>();
    for (const memo of memos) {
      const key = localDateKey(memo.createdAt);
      grouped.set(key, [...(grouped.get(key) ?? []), memo]);
    }
    return [...grouped.entries()].map(([key, groupedMemos]) => ({
      key,
      label: dayLabel(key),
      memos: groupedMemos,
    }));
  }, [memos]);

  function resizeTextarea(element: HTMLTextAreaElement | null) {
    if (!element) {
      return;
    }
    element.style.height = "0";
    element.style.height = `${Math.min(element.scrollHeight, 280)}px`;
  }

  useEffect(() => {
    resizeTextarea(composerRef.current);
  }, [draft]);

  useEffect(() => {
    resizeTextarea(editRef.current);
  }, [editContent, editingId]);

  async function createNewMemo() {
    const content = draft.trim();
    setComposerError("");
    if (!content) {
      setComposerError("写点什么再保存");
      composerRef.current?.focus();
      return;
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      setComposerError("单条记录最多 5000 字");
      return;
    }

    setIsCreating(true);
    try {
      const data = await apiRequest<{ memo: Memo }>("/api/memos", {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setMemos((current) => sortMemos([data.memo, ...current]));
      setDraft("");
      window.localStorage.removeItem(DRAFT_KEY);
      setNewMemoId(data.memo.id);
      window.setTimeout(() => setNewMemoId(null), 700);
      setNotice("已记下");
      window.setTimeout(() => setNotice(""), 1400);
      composerRef.current?.focus();
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : "暂时无法保存",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function handleComposerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createNewMemo();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void createNewMemo();
    }
  }

  function startEditing(memo: Memo) {
    setEditingId(memo.id);
    setEditContent(memo.content);
    setConfirmingDeleteId(null);
  }

  async function saveEdit(id: string) {
    const content = editContent.trim();
    if (!content || content.length > MAX_CONTENT_LENGTH) {
      return;
    }

    setBusyMemoId(id);
    try {
      const data = await apiRequest<{ memo: Memo }>(`/api/memos/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      });
      setMemos((current) =>
        current.map((memo) => (memo.id === id ? data.memo : memo)),
      );
      setEditingId(null);
      setNotice("修改已保存");
      window.setTimeout(() => setNotice(""), 1400);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "无法保存修改");
    } finally {
      setBusyMemoId(null);
    }
  }

  async function deleteMemo(memo: Memo) {
    setBusyMemoId(memo.id);
    try {
      await apiRequest<{ memo: Memo }>(`/api/memos/${memo.id}`, {
        method: "DELETE",
      });
      setMemos((current) => current.filter((item) => item.id !== memo.id));
      setConfirmingDeleteId(null);
      setUndoState({ memo });
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
      undoTimerRef.current = setTimeout(() => setUndoState(null), 8000);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "无法删除");
    } finally {
      setBusyMemoId(null);
    }
  }

  async function undoDelete() {
    if (!undoState) {
      return;
    }

    const memo = undoState.memo;
    setBusyMemoId(memo.id);
    try {
      const data = await apiRequest<{ memo: Memo }>(
        `/api/memos/${memo.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ restore: true }),
        },
      );
      setMemos((current) => sortMemos([data.memo, ...current]));
      setUndoState(null);
      setNotice("记录已恢复");
      window.setTimeout(() => setNotice(""), 1400);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "无法恢复");
    } finally {
      setBusyMemoId(null);
    }
  }

  async function convertMemoToTask(memo: Memo) {
    const lines = memo.content.trim().split("\n");
    const title = lines[0]?.trim() ?? "无标题任务";
    const description = lines.slice(1).join("\n").trim();

    setBusyMemoId(memo.id);
    try {
      await apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          sourceMemoId: memo.id,
        }),
      });
      setNotice("已成功转为关联任务！");
      window.setTimeout(() => setNotice(""), 1800);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "无法转为任务");
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
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">
            拾
          </div>
          <span>Shinian</span>
        </div>

        <nav aria-label="主要导航" className={styles.nav}>
          <a aria-current="page" className={styles.navActive} href="/notes">
            <span className={styles.activeDot} aria-hidden="true" />
            <Feather aria-hidden="true" size={17} strokeWidth={1.7} />
            记录
          </a>
          <a href="/tasks">
            <CheckSquare aria-hidden="true" size={17} strokeWidth={1.7} />
            任务
          </a>
          <a href="/search">
            <Search aria-hidden="true" size={17} strokeWidth={1.7} />
            搜索
          </a>
          <a href="/review">
            <Sparkles aria-hidden="true" size={17} strokeWidth={1.7} />
            回顾
          </a>
          <a href="/settings">
            <Settings aria-hidden="true" size={17} strokeWidth={1.7} />
            设置
          </a>
        </nav>

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

      <main id="main-content" className={styles.main}>
        <header className={styles.mobileHeader}>
          <div className={styles.mobileBrand}>
            <div className={styles.brandMark} aria-hidden="true">
              拾
            </div>
            <span>Shinian</span>
          </div>
          <button aria-label="退出登录" onClick={logout} type="button">
            <LogOut aria-hidden="true" size={18} />
          </button>
        </header>

        <div className={styles.contentColumn}>
          <section className={styles.composerSection} aria-label="快速记录">
            <div className={styles.composerHeading}>
              <div>
                <p className={styles.eyebrow}>此刻</p>
                <h1>想到什么？</h1>
              </div>
              <span className={styles.notice} aria-live="polite">
                {notice}
              </span>
            </div>

            <form className={styles.composer} onSubmit={handleComposerSubmit}>
              <label className={styles.visuallyHidden} htmlFor="memo-content">
                记录内容
              </label>
              <textarea
                aria-describedby={
                  composerError ? "composer-error" : "composer-hint"
                }
                autoFocus
                id="memo-content"
                maxLength={MAX_CONTENT_LENGTH}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setComposerError("");
                }}
                onKeyDown={handleComposerKeyDown}
                placeholder="无需标题，直接写下这一刻……"
                ref={composerRef}
                rows={3}
                value={draft}
              />
              <div className={styles.composerFooter}>
                <div className={styles.composerMeta}>
                  {composerError ? (
                    <span className={styles.errorText} id="composer-error">
                      {composerError}
                    </span>
                  ) : (
                    <span id="composer-hint">⌘ / Ctrl + Enter 保存</span>
                  )}
                  {draft.length > 4500 ? (
                    <span className={styles.characterCount}>
                      {draft.length}/{MAX_CONTENT_LENGTH}
                    </span>
                  ) : null}
                </div>
                <button
                  disabled={isCreating || !draft.trim()}
                  type="submit"
                >
                  <span>{isCreating ? "保存中" : "记下"}</span>
                  <Send aria-hidden="true" size={16} strokeWidth={1.8} />
                </button>
              </div>
            </form>
          </section>

          <section className={styles.timeline} aria-labelledby="timeline-title">
            <div className={styles.timelineHeader}>
              <h2 id="timeline-title">最近记录</h2>
              <span>{memos.length} 条</span>
            </div>

            {groups.length === 0 ? (
              <div className={styles.emptyState}>
                <span aria-hidden="true">一</span>
                <h3>第一条记录会从这里开始。</h3>
                <p>不用整理，也不用想标题。先把此刻留下来。</p>
              </div>
            ) : (
              <div className={styles.groups}>
                {groups.map((group) => (
                  <section
                    className={styles.dayGroup}
                    key={group.key}
                    aria-labelledby={`day-${group.key}`}
                  >
                    <div className={styles.dayLabel}>
                      <h3 id={`day-${group.key}`}>{group.label}</h3>
                      <span>{group.memos.length}</span>
                    </div>

                    <div>
                      {group.memos.map((memo) => {
                        const isEditing = editingId === memo.id;
                        const isConfirmingDelete =
                          confirmingDeleteId === memo.id;
                        const wasEdited =
                          Math.abs(
                            new Date(memo.updatedAt).getTime() -
                              new Date(memo.createdAt).getTime(),
                          ) > 1000;

                        return (
                          <article
                            className={`${styles.memo} ${
                              memo.id === newMemoId ? styles.memoNew : ""
                            } ${isEditing ? styles.memoEditing : ""}`}
                            key={memo.id}
                          >
                            {isEditing ? (
                              <div className={styles.editPanel}>
                                <label
                                  className={styles.visuallyHidden}
                                  htmlFor={`edit-${memo.id}`}
                                >
                                  编辑记录
                                </label>
                                <textarea
                                  id={`edit-${memo.id}`}
                                  maxLength={MAX_CONTENT_LENGTH}
                                  onChange={(event) =>
                                    setEditContent(event.target.value)
                                  }
                                  ref={editRef}
                                  rows={3}
                                  value={editContent}
                                />
                                <div className={styles.editActions}>
                                  <button
                                    className={styles.quietButton}
                                    onClick={() => setEditingId(null)}
                                    type="button"
                                  >
                                    <X aria-hidden="true" size={15} />
                                    取消
                                  </button>
                                  <button
                                    className={styles.saveButton}
                                    disabled={
                                      busyMemoId === memo.id ||
                                      !editContent.trim()
                                    }
                                    onClick={() => void saveEdit(memo.id)}
                                    type="button"
                                  >
                                    <Check aria-hidden="true" size={15} />
                                    保存
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className={styles.memoTopline}>
                                  <time dateTime={memo.createdAt}>
                                    {timeLabel(memo.createdAt)}
                                  </time>
                                  {wasEdited ? <span>已编辑</span> : null}
                                </div>
                                <p className={styles.memoContent}>
                                  <MemoContent content={memo.content} />
                                </p>

                                {isConfirmingDelete ? (
                                  <div className={styles.deleteConfirm}>
                                    <span>移到回收站？</span>
                                    <button
                                      onClick={() =>
                                        setConfirmingDeleteId(null)
                                      }
                                      type="button"
                                    >
                                      取消
                                    </button>
                                    <button
                                      className={styles.deleteButton}
                                      disabled={busyMemoId === memo.id}
                                      onClick={() => void deleteMemo(memo)}
                                      type="button"
                                    >
                                      确认删除
                                    </button>
                                  </div>
                                ) : (
                                  <div className={styles.memoActions}>
                                    <button
                                      aria-label="转为关联任务"
                                      disabled={busyMemoId === memo.id}
                                      onClick={() => void convertMemoToTask(memo)}
                                      type="button"
                                    >
                                      <CheckSquare
                                        aria-hidden="true"
                                        size={16}
                                        strokeWidth={1.7}
                                      />
                                      <span>转为任务</span>
                                    </button>
                                    <button
                                      aria-label="编辑这条记录"
                                      onClick={() => startEditing(memo)}
                                      type="button"
                                    >
                                      <PencilLine
                                        aria-hidden="true"
                                        size={16}
                                        strokeWidth={1.7}
                                      />
                                      <span>编辑</span>
                                    </button>
                                    <button
                                      aria-label="删除这条记录"
                                      onClick={() =>
                                        setConfirmingDeleteId(memo.id)
                                      }
                                      type="button"
                                    >
                                      <Trash2
                                        aria-hidden="true"
                                        size={16}
                                        strokeWidth={1.7}
                                      />
                                      <span>删除</span>
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {undoState ? (
        <div className={styles.undoToast} role="status">
          <span>记录已移到回收站</span>
          <button
            disabled={busyMemoId === undoState.memo.id}
            onClick={() => void undoDelete()}
            type="button"
          >
            <Undo2 aria-hidden="true" size={15} />
            撤销
          </button>
        </div>
      ) : null}
    </div>
  );
}
