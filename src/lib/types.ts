export type Memo = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TaskStatus = "inbox" | "todo" | "doing" | "done" | "cancelled";
export type TaskPriority = "none" | "low" | "medium" | "high";
export type RecurrenceRule =
  | "none"
  | "daily"
  | "workday"
  | "weekly"
  | "monthly"
  | "yearly";

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  listName: string;
  startDate: string | null;
  dueDate: string | null;
  reminderAt: string | null;
  recurrenceRule: RecurrenceRule;
  completedAt: string | null;
  sourceMemoId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TaskFilterView = "inbox" | "today" | "next7" | "completed" | "all";

export type SessionUser = {
  username: string;
};

