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
import Link from "next/link";
import Image from "next/image";
import { SidebarTagTree } from "./SidebarTagTree";
import { MobileNavigation } from "./MobileNavigation";
import {
  Check,
  CheckSquare,
  Feather,
  LogOut,
  PencilLine,
  ImagePlus,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import type { Memo, MemoAttachment } from "@/lib/types";
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

function hasTaskIntent(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    content.includes("#任务") ||
    content.includes("#待办") ||
    content.includes("- [ ]") ||
    content.includes("- [x]") ||
    lower.startsWith("todo") ||
    lower.startsWith("待办")
  );
}

function extractTaskTitleAndDesc(content: string): {
  title: string;
  description: string;
} {
  const lines = content.trim().split("\n");
  const firstLine = lines[0]?.trim() ?? "";

  // Strip leading task checkbox markdown marker (- [ ] or - [x]) if present
  const cleanedFirstLine = firstLine.replace(/^- \[[ xX]\]\s*/, "").trim();

  const title = cleanedFirstLine || firstLine || "无标题任务";
  const description = lines.slice(1).join("\n").trim();

  return { title, description };
}

function MemoContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div style={{ whiteSpace: "pre-wrap" }}>
      {lines.map((line, lineIdx) => {
        const isUnchecked = line.trim().startsWith("- [ ]");
        const isChecked =
          line.trim().startsWith("- [x]") || line.trim().startsWith("- [X]");
        let lineContent = line;

        if (isUnchecked) {
          lineContent = line.replace(/^\s*-\s*\[\s*\]\s*/, "");
        } else if (isChecked) {
          lineContent = line.replace(/^\s*-\s*\[[xX]\]\s*/, "");
        }

        const segments = lineContent.split(/(#[\p{L}\p{N}_/-]+)/gu);

        return (
          <div
            key={lineIdx}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "6px",
              marginBottom: lineIdx < lines.length - 1 ? "2px" : "0",
            }}
          >
            {isUnchecked ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  color: "var(--ink-muted)",
                  flexShrink: 0,
                  transform: "translateY(2px)",
                }}
              >
                <CheckSquare size={14} />
              </span>
            ) : isChecked ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  color: "var(--accent)",
                  flexShrink: 0,
                  transform: "translateY(2px)",
                }}
              >
                <Check size={14} strokeWidth={3} />
              </span>
            ) : null}
            <span
              style={{
                textDecoration: isChecked ? "line-through" : "none",
                opacity: isChecked ? 0.65 : 1,
              }}
            >
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
            </span>
          </div>
        );
      })}
    </div>
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
  const [pendingImages, setPendingImages] = useState<File[]>([]);
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

    const isTaskIntent = hasTaskIntent(content);
    const tempId = `temp-${Date.now()}`;
    const optimisticMemo: Memo = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      attachments: [],
    };

    // Optimistic UI update: instantly insert to list & clear draft for 0ms lag
    setMemos((current) => sortMemos([optimisticMemo, ...current]));
    setDraft("");
    window.localStorage.removeItem(DRAFT_KEY);
    setNewMemoId(tempId);
    window.setTimeout(() => setNewMemoId(null), 700);

    setIsCreating(true);
    try {
      const data = await apiRequest<{ memo: Memo }>("/api/memos", {
        method: "POST",
        body: JSON.stringify({ content }),
      });

      // Update optimistic memo with server data
      setMemos((current) =>
        sortMemos(current.map((m) => (m.id === tempId ? data.memo : m))),
      );

      const uploadedAttachments: MemoAttachment[] = [];
      let uploadFailed = false;
      for (const image of pendingImages) {
        const formData = new FormData();
        formData.append("file", image);
        const uploadResponse = await fetch(`/api/memos/${data.memo.id}/attachments`, {
          method: "POST",
          body: formData,
        });
        if (!uploadResponse.ok) {
          uploadFailed = true;
          continue;
        }
        const result = (await uploadResponse.json()) as {
          attachment: MemoAttachment;
        };
        uploadedAttachments.push(result.attachment);
      }
      if (uploadedAttachments.length > 0) {
        setMemos((current) =>
          current.map((memo) =>
            memo.id === data.memo.id
              ? { ...memo, attachments: uploadedAttachments }
              : memo,
          ),
        );
      }
      setPendingImages([]);

      // Auto convert to task if #任务 or - [ ] or todo intent is present
      if (isTaskIntent) {
        const { title, description } = extractTaskTitleAndDesc(content);
        try {
          await apiRequest("/api/tasks", {
            method: "POST",
            body: JSON.stringify({
              title,
              description,
              sourceMemoId: data.memo.id,
            }),
          });
          setNotice(
            uploadFailed
              ? "笔记和任务已保存，部分图片上传失败"
              : "已记下笔记，并已自动同步生成对应任务！",
          );
        } catch {
          setNotice("笔记已保存（自动同步任务失败）");
        }
      } else {
        setNotice(uploadFailed ? "笔记已保存，部分图片上传失败" : "已记下");
      }
      window.setTimeout(() => setNotice(""), 1800);
      composerRef.current?.focus();
    } catch (error) {
      // Revert optimistic memo on error
      setMemos((current) => current.filter((m) => m.id !== tempId));
      setDraft(content);
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
    const { title, description } = extractTaskTitleAndDesc(memo.content);

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
      setNotice("已成功生成关联任务（原笔记已完整保留）！");
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
          <Link aria-current="page" className={styles.navActive} href="/notes">
            <span className={styles.activeDot} aria-hidden="true" />
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
          <Link href="/review">
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

        <MobileNavigation active="notes" />

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
              <div className={styles.composerInner}>
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
                {hasTaskIntent(draft) ? (
                  <div
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      color: "var(--accent-strong)",
                      background: "var(--accent-soft)",
                      borderRadius: "var(--radius-small)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "8px",
                    }}
                  >
                    <Sparkles size={13} />
                    <span>包含 `#任务` / 待办语法，提交后将自动为您同步生成关联任务（原笔记将保留）</span>
                  </div>
                ) : null}
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
                  <div className={styles.composerControls}>
                    <label className={styles.imagePicker}>
                      <ImagePlus aria-hidden="true" size={17} />
                      <span>{pendingImages.length ? `${pendingImages.length} 张` : "图片"}</span>
                      <input
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        multiple
                        onChange={(event) => {
                          const images = Array.from(event.target.files ?? []).slice(0, 4);
                          setPendingImages(images);
                          event.target.value = "";
                        }}
                        type="file"
                      />
                    </label>
                    <button
                      disabled={isCreating || !draft.trim()}
                      type="submit"
                    >
                      <span>{isCreating ? "保存中" : "记下"}</span>
                      <Send aria-hidden="true" size={16} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
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
                                <div className={styles.memoContent}>
                                  <MemoContent content={memo.content} />
                                </div>
                                {memo.attachments.length > 0 ? (
                                  <div className={styles.attachmentGrid}>
                                    {memo.attachments.map((attachment) => (
                                      <a
                                        href={attachment.url}
                                        key={attachment.id}
                                        rel="noreferrer"
                                        target="_blank"
                                      >
                                        <Image
                                          alt={attachment.filename}
                                          height={480}
                                          src={attachment.url}
                                          unoptimized
                                          width={640}
                                        />
                                      </a>
                                    ))}
                                  </div>
                                ) : null}

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
