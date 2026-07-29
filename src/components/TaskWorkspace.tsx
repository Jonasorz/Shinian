"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Feather,
  Filter,
  Flag,
  Inbox,
  ListFilter,
  LogOut,
  PencilLine,
  Plus,
  RotateCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import type {
  RecurrenceRule,
  Task,
  TaskFilterView,
  TaskPriority,
} from "@/lib/types";
import styles from "@/app/tasks/tasks.module.css";

type UndoState = {
  task: Task;
};

type TaskWorkspaceProps = {
  initialTasks: Task[];
  initialLists: string[];
  username: string;
};

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
    throw new Error(data.error ?? "请求处理失败");
  }
  return data;
}

function formatDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDueDateLabel(dueDateStr: string | null): {
  label: string;
  isOverdue: boolean;
} {
  if (!dueDateStr) return { label: "", isOverdue: false };

  const dueKey = formatDateKey(dueDateStr);
  const todayKey = formatDateKey(new Date().toISOString());

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowKey = formatDateKey(tomorrowDate.toISOString());

  if (dueKey === todayKey) {
    return { label: "今天到期", isOverdue: false };
  }
  if (dueKey === tomorrowKey) {
    return { label: "明天到期", isOverdue: false };
  }

  const isOverdue = dueKey < todayKey;

  const formatted = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(dueDateStr));

  return {
    label: isOverdue ? `已逾期 (${formatted})` : formatted,
    isOverdue,
  };
}

export function TaskWorkspace({
  initialTasks,
  initialLists,
  username,
}: TaskWorkspaceProps) {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [lists, setLists] = useState<string[]>(initialLists);
  const [activeView, setActiveView] = useState<TaskFilterView>("inbox");
  const [activeList, setActiveList] = useState<string | null>(null);

  // New task form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("none");
  const [listName, setListName] = useState("收件箱");
  const [dueDate, setDueDate] = useState("");
  const [recurrenceRule, setRecurrenceRule] =
    useState<RecurrenceRule>("none");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  // Edit task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("none");
  const [editListName, setEditListName] = useState("收件箱");
  const [editDueDate, setEditDueDate] = useState("");
  const [editRecurrenceRule, setEditRecurrenceRule] =
    useState<RecurrenceRule>("none");

  // Deletion & Undo state
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memo creation prompt state
  const [memoNotice, setMemoNotice] = useState<{
    taskTitle: string;
    taskId: string;
  } | null>(null);

  // Filter tasks based on view & active list
  const filteredTasks = useMemo(() => {
    const todayKey = formatDateKey(new Date().toISOString());

    const next7Date = new Date();
    next7Date.setDate(next7Date.getDate() + 7);
    const next7Key = formatDateKey(next7Date.toISOString());

    return tasks.filter((task) => {
      if (activeList) {
        return task.listName === activeList;
      }

      if (activeView === "inbox") {
        return (
          task.listName === "收件箱" &&
          task.status !== "done" &&
          task.status !== "cancelled"
        );
      }

      if (activeView === "today") {
        if (task.status === "done" || task.status === "cancelled") return false;
        if (!task.dueDate && !task.startDate) return false;
        const dueKey = task.dueDate ? formatDateKey(task.dueDate) : "";
        const startKey = task.startDate ? formatDateKey(task.startDate) : "";
        return (
          (dueKey && dueKey <= todayKey) || (startKey && startKey <= todayKey)
        );
      }

      if (activeView === "next7") {
        if (task.status === "done" || task.status === "cancelled") return false;
        if (!task.dueDate) return false;
        const dueKey = formatDateKey(task.dueDate);
        return dueKey >= todayKey && dueKey <= next7Key;
      }

      if (activeView === "completed") {
        return task.status === "done";
      }

      return true; // 'all'
    });
  }, [tasks, activeView, activeList]);

  // Count metrics for view badges
  const counts = useMemo(() => {
    const todayKey = formatDateKey(new Date().toISOString());

    const next7Date = new Date();
    next7Date.setDate(next7Date.getDate() + 7);
    const next7Key = formatDateKey(next7Date.toISOString());

    let inbox = 0;
    let today = 0;
    let next7 = 0;
    let completed = 0;

    for (const t of tasks) {
      if (t.status === "done") {
        completed++;
        continue;
      }
      if (t.status === "cancelled") continue;

      if (t.listName === "收件箱") inbox++;

      const dueKey = t.dueDate ? formatDateKey(t.dueDate) : "";
      const startKey = t.startDate ? formatDateKey(t.startDate) : "";

      if ((dueKey && dueKey <= todayKey) || (startKey && startKey <= todayKey)) {
        today++;
      }
      if (dueKey && dueKey >= todayKey && dueKey <= next7Key) {
        next7++;
      }
    }

    return { inbox, today, next7, completed, all: tasks.length };
  }, [tasks]);

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setNotice("");

    try {
      const data = await apiRequest<{ task: Task }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || undefined,
          priority,
          listName: listName || "收件箱",
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          recurrenceRule,
        }),
      });

      setTasks((prev) => [data.task, ...prev]);
      if (!lists.includes(data.task.listName)) {
        setLists((prev) => Array.from(new Set([...prev, data.task.listName])));
      }

      setTitle("");
      setDescription("");
      setDueDate("");
      setNotice("任务已添加");
      setTimeout(() => setNotice(""), 1600);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "创建任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleComplete(task: Task) {
    const isCurrentlyDone = task.status === "done";
    const newStatus = isCurrentlyDone ? "todo" : "done";

    setBusyTaskId(task.id);
    try {
      const data = await apiRequest<{ task: Task }>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? data.task : t)),
      );

      if (!isCurrentlyDone) {
        setMemoNotice({ taskTitle: task.title, taskId: task.id });
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "状态更新失败");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleCreateReflectionMemo(taskTitle: string) {
    try {
      await apiRequest("/api/memos", {
        method: "POST",
        body: JSON.stringify({
          content: `[完成复盘] ${taskTitle}\n#任务复盘`,
        }),
      });
      setMemoNotice(null);
      setNotice("复盘已成功沉淀为 Memo 笔记！");
      setTimeout(() => setNotice(""), 2000);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "生成复盘失败");
    }
  }

  function startEditing(task: Task) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditPriority(task.priority);
    setEditListName(task.listName);
    setEditDueDate(task.dueDate ? task.dueDate.split("T")[0]! : "");
    setEditRecurrenceRule(task.recurrenceRule);
  }

  async function saveTaskEdit(id: string) {
    if (!editTitle.trim()) return;

    setBusyTaskId(id);
    try {
      const data = await apiRequest<{ task: Task }>(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          priority: editPriority,
          listName: editListName,
          dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
          recurrenceRule: editRecurrenceRule,
        }),
      });

      setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
      setEditingTaskId(null);
      setNotice("保存成功");
      setTimeout(() => setNotice(""), 1400);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "保存修改失败");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function deleteTask(task: Task) {
    setBusyTaskId(task.id);
    try {
      await apiRequest(`/api/tasks/${task.id}`, { method: "DELETE" });

      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setConfirmingDeleteId(null);
      setUndoState({ task });

      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoState(null), 8000);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function undoDelete() {
    if (!undoState) return;
    const { task } = undoState;
    setBusyTaskId(task.id);

    try {
      const data = await apiRequest<{ task: Task }>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ restore: true }),
      });

      setTasks((prev) => [data.task, ...prev]);
      setUndoState(null);
      setNotice("任务已恢复");
      setTimeout(() => setNotice(""), 1400);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "恢复失败");
    } finally {
      setBusyTaskId(null);
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
          <a href="/notes">
            <Feather aria-hidden="true" size={17} strokeWidth={1.7} />
            记录
          </a>
          <a aria-current="page" className={styles.navActive} href="/tasks">
            <span className={styles.activeDot} aria-hidden="true" />
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
            <a className={styles.mobileNavActive} href="/tasks">
              任务
            </a>
            <a href="/search">搜索</a>
            <a href="/review">回顾</a>
            <a href="/settings">设置</a>
          </div>
          <button aria-label="退出登录" onClick={logout} type="button">
            <LogOut aria-hidden="true" size={18} />
          </button>
        </header>

        <div className={styles.contentColumn}>
          <div className={styles.pageHeader}>
            <div>
              <p className={styles.eyebrow}>行动</p>
              <h1>轻量任务管理</h1>
            </div>
            {notice ? (
              <span className={styles.notice} aria-live="polite">
                {notice}
              </span>
            ) : null}
          </div>

          {/* View Selection Tabs */}
          <div className={styles.viewTabs}>
            <button
              className={`${styles.tabButton} ${
                activeView === "inbox" && !activeList ? styles.activeTab : ""
              }`}
              onClick={() => {
                setActiveView("inbox");
                setActiveList(null);
              }}
              type="button"
            >
              <Inbox size={15} />
              收件箱
              <span className={styles.tabCount}>{counts.inbox}</span>
            </button>

            <button
              className={`${styles.tabButton} ${
                activeView === "today" && !activeList ? styles.activeTab : ""
              }`}
              onClick={() => {
                setActiveView("today");
                setActiveList(null);
              }}
              type="button"
            >
              <Calendar size={15} />
              今日
              <span className={styles.tabCount}>{counts.today}</span>
            </button>

            <button
              className={`${styles.tabButton} ${
                activeView === "next7" && !activeList ? styles.activeTab : ""
              }`}
              onClick={() => {
                setActiveView("next7");
                setActiveList(null);
              }}
              type="button"
            >
              <Clock size={15} />
              最近 7 天
              <span className={styles.tabCount}>{counts.next7}</span>
            </button>

            <button
              className={`${styles.tabButton} ${
                activeView === "completed" && !activeList ? styles.activeTab : ""
              }`}
              onClick={() => {
                setActiveView("completed");
                setActiveList(null);
              }}
              type="button"
            >
              <CheckSquare size={15} />
              已完成
              <span className={styles.tabCount}>{counts.completed}</span>
            </button>

            <button
              className={`${styles.tabButton} ${
                activeView === "all" && !activeList ? styles.activeTab : ""
              }`}
              onClick={() => {
                setActiveView("all");
                setActiveList(null);
              }}
              type="button"
            >
              <ListFilter size={15} />
              全部
              <span className={styles.tabCount}>{counts.all}</span>
            </button>

            {/* Custom List Filter Options */}
            {lists
              .filter((l) => l !== "收件箱")
              .map((l) => (
                <button
                  key={l}
                  className={`${styles.tabButton} ${
                    activeList === l ? styles.activeTab : ""
                  }`}
                  onClick={() => setActiveList(l)}
                  type="button"
                >
                  <Filter size={14} />
                  {l}
                </button>
              ))}
          </div>

          {/* New Task Composer Card */}
          <form className={styles.composerCard} onSubmit={handleCreateTask}>
            <div className={styles.composerTitleRow}>
              <Plus size={18} style={{ color: "var(--ink-muted)" }} />
              <input
                className={styles.titleInput}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="准备做什么？(支持直接创建任务)"
                type="text"
                value={title}
              />
            </div>

            {title.trim() ? (
              <textarea
                className={styles.descriptionInput}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="补充详细备注..."
                value={description}
              />
            ) : null}

            <div className={styles.composerMetaRow}>
              <div className={styles.metaControls}>
                {/* Priority */}
                <div className={styles.selectControl}>
                  <Flag size={13} />
                  <select
                    onChange={(e) =>
                      setPriority(e.target.value as TaskPriority)
                    }
                    value={priority}
                  >
                    <option value="none">优先级：无</option>
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>

                {/* List */}
                <div className={styles.selectControl}>
                  <Inbox size={13} />
                  <select
                    onChange={(e) => setListName(e.target.value)}
                    value={listName}
                  >
                    {lists.map((l) => (
                      <option key={l} value={l}>
                        清单：{l}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div className={styles.dateControl}>
                  <Calendar size={13} />
                  <input
                    onChange={(e) => setDueDate(e.target.value)}
                    type="date"
                    value={dueDate}
                  />
                </div>

                {/* Recurrence */}
                <div className={styles.selectControl}>
                  <RotateCw size={13} />
                  <select
                    onChange={(e) =>
                      setRecurrenceRule(e.target.value as RecurrenceRule)
                    }
                    value={recurrenceRule}
                  >
                    <option value="none">不重复</option>
                    <option value="daily">每天</option>
                    <option value="workday">工作日</option>
                    <option value="weekly">每周</option>
                    <option value="monthly">每月</option>
                    <option value="yearly">每年</option>
                  </select>
                </div>
              </div>

              <button
                className={styles.submitTaskButton}
                disabled={!title.trim() || isSubmitting}
                type="submit"
              >
                添加任务
              </button>
            </div>
          </form>

          {/* Reflection Memo Toast Prompt */}
          {memoNotice ? (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px 16px",
                borderRadius: "var(--radius-control)",
                background: "var(--accent-soft)",
                border: "1px solid var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={16} style={{ color: "var(--accent-strong)" }} />
                <span style={{ fontSize: "13px", fontWeight: 500 }}>
                  完成了 “{memoNotice.taskTitle}”，是否要记录完成心得/复盘到 Memo？
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() =>
                    handleCreateReflectionMemo(memoNotice.taskTitle)
                  }
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: "var(--accent-strong)",
                    color: "white",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  type="button"
                >
                  沉淀为 Memo
                </button>
                <button
                  onClick={() => setMemoNotice(null)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "transparent",
                    border: "none",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                  type="button"
                >
                  跳过
                </button>
              </div>
            </div>
          ) : null}

          {/* Task Items List */}
          <section className={styles.taskListSection}>
            {filteredTasks.length === 0 ? (
              <div className={styles.emptyState}>
                <CheckSquare size={36} strokeWidth={1.2} />
                <p>该视图下暂无任务，轻松一下吧</p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isEditing = editingTaskId === task.id;
                const isConfirmingDelete = confirmingDeleteId === task.id;
                const isDone = task.status === "done";
                const { label: dueLabel, isOverdue } = formatDueDateLabel(
                  task.dueDate,
                );

                return (
                  <article
                    key={task.id}
                    className={`${styles.taskCard} ${
                      isDone ? styles.taskDone : ""
                    }`}
                  >
                    {isEditing ? (
                      /* Inline Edit Form */
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <input
                          className={styles.titleInput}
                          onChange={(e) => setEditTitle(e.target.value)}
                          style={{
                            borderBottom: "1px solid var(--divider)",
                            paddingBottom: "4px",
                          }}
                          type="text"
                          value={editTitle}
                        />
                        <textarea
                          className={styles.descriptionInput}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="修改备注..."
                          value={editDescription}
                        />
                        <div
                          className={styles.metaControls}
                          style={{ marginTop: "4px" }}
                        >
                          <div className={styles.selectControl}>
                            <Flag size={12} />
                            <select
                              onChange={(e) =>
                                setEditPriority(e.target.value as TaskPriority)
                              }
                              value={editPriority}
                            >
                              <option value="none">无</option>
                              <option value="low">低</option>
                              <option value="medium">中</option>
                              <option value="high">高</option>
                            </select>
                          </div>
                          <div className={styles.dateControl}>
                            <Calendar size={12} />
                            <input
                              onChange={(e) => setEditDueDate(e.target.value)}
                              type="date"
                              value={editDueDate}
                            />
                          </div>
                          <div className={styles.selectControl}>
                            <Inbox size={12} />
                            <input
                              onChange={(e) => setEditListName(e.target.value)}
                              style={{
                                width: "80px",
                                border: "none",
                                outline: "none",
                                background: "transparent",
                                fontSize: "12px",
                              }}
                              type="text"
                              value={editListName}
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "8px",
                            marginTop: "8px",
                          }}
                        >
                          <button
                            onClick={() => setEditingTaskId(null)}
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
                            onClick={() => void saveTaskEdit(task.id)}
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
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display View */
                      <>
                        <div className={styles.taskMainRow}>
                          <button
                            aria-label={isDone ? "标记为未完成" : "标记为已完成"}
                            className={`${styles.checkButton} ${
                              isDone ? styles.checkButtonDone : ""
                            }`}
                            disabled={busyTaskId === task.id}
                            onClick={() => void handleToggleComplete(task)}
                            type="button"
                          >
                            <Check size={14} strokeWidth={2.5} />
                          </button>

                          <div className={styles.taskBody}>
                            <h3
                              className={`${styles.taskTitle} ${
                                isDone ? styles.taskDoneTitle : ""
                              }`}
                            >
                              {task.title}
                            </h3>

                            {task.description ? (
                              <p className={styles.taskDescription}>
                                {task.description}
                              </p>
                            ) : null}

                            <div className={styles.taskMetaTags}>
                              {/* List badge */}
                              <span
                                className={`${styles.badge} ${styles.badgeList}`}
                              >
                                {task.listName}
                              </span>

                              {/* Priority badge */}
                              {task.priority !== "none" ? (
                                <span
                                  className={`${styles.badge} ${
                                    task.priority === "high"
                                      ? styles.priorityHigh
                                      : task.priority === "medium"
                                      ? styles.priorityMedium
                                      : styles.priorityLow
                                  }`}
                                >
                                  {task.priority === "high"
                                    ? "高优先级"
                                    : task.priority === "medium"
                                    ? "中优先级"
                                    : "低优先级"}
                                </span>
                              ) : null}

                              {/* Due Date badge */}
                              {dueLabel ? (
                                <span
                                  className={`${styles.badge} ${
                                    isOverdue
                                      ? styles.badgeOverdue
                                      : styles.badgeDue
                                  }`}
                                >
                                  <Calendar size={11} />
                                  {dueLabel}
                                </span>
                              ) : null}

                              {/* Recurrence Rule */}
                              {task.recurrenceRule !== "none" ? (
                                <span
                                  className={`${styles.badge} ${styles.badgeList}`}
                                >
                                  <RotateCw size={11} />
                                  {task.recurrenceRule === "daily"
                                    ? "每天"
                                    : task.recurrenceRule === "workday"
                                    ? "工作日"
                                    : task.recurrenceRule === "weekly"
                                    ? "每周"
                                    : task.recurrenceRule === "monthly"
                                    ? "每月"
                                    : "每年"}
                                </span>
                              ) : null}

                              {/* Source Memo badge */}
                              {task.sourceMemoId ? (
                                <a
                                  className={styles.sourceMemoLink}
                                  href={`/notes#memo-${task.sourceMemoId}`}
                                >
                                  来源笔记 ↗
                                </a>
                              ) : null}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {isConfirmingDelete ? (
                            <div className={styles.deleteConfirm}>
                              <span>删除任务？</span>
                              <button
                                onClick={() => setConfirmingDeleteId(null)}
                                type="button"
                              >
                                取消
                              </button>
                              <button
                                className={styles.deleteConfirmButton}
                                disabled={busyTaskId === task.id}
                                onClick={() => void deleteTask(task)}
                                type="button"
                              >
                                删除
                              </button>
                            </div>
                          ) : (
                            <div className={styles.taskActions}>
                              <button
                                className={styles.taskActionButton}
                                onClick={() => startEditing(task)}
                                type="button"
                              >
                                <PencilLine size={14} />
                              </button>
                              <button
                                className={styles.taskActionButton}
                                onClick={() => setConfirmingDeleteId(task.id)}
                                type="button"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </article>
                );
              })
            )}
          </section>
        </div>
      </main>

      {/* Undo Toast */}
      {undoState ? (
        <div className={styles.undoToast} role="status">
          <span>任务已软删除</span>
          <button
            disabled={busyTaskId === undoState.task.id}
            onClick={() => void undoDelete()}
            type="button"
          >
            <Undo2 size={14} />
            撤销删除
          </button>
        </div>
      ) : null}
    </div>
  );
}
