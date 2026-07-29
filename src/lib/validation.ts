import { z } from "zod";

export const memoContentSchema = z
  .string()
  .trim()
  .min(1, "写点什么再保存")
  .max(5000, "单条记录最多 5000 字");

export const createMemoSchema = z.object({
  content: memoContentSchema,
});

export const updateMemoSchema = z
  .object({
    content: memoContentSchema.optional(),
    restore: z.boolean().optional(),
  })
  .refine((value) => value.content !== undefined || value.restore === true, {
    message: "没有需要更新的内容",
  });

export const loginSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名").max(80),
  password: z.string().min(1, "请输入密码").max(256),
});

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "请输入任务标题")
    .max(500, "任务标题最多 500 字"),
  description: z
    .string()
    .trim()
    .max(5000, "任务备注最多 5000 字")
    .optional()
    .default(""),
  priority: z
    .enum(["none", "low", "medium", "high"])
    .optional()
    .default("none"),
  listName: z.string().trim().min(1).max(100).optional().default("收件箱"),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  reminderAt: z.string().nullable().optional(),
  recurrenceRule: z
    .enum(["none", "daily", "workday", "weekly", "monthly", "yearly"])
    .optional()
    .default("none"),
  sourceMemoId: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "任务标题不能为空")
    .max(500, "任务标题最多 500 字")
    .optional(),
  description: z.string().trim().max(5000, "任务备注最多 5000 字").optional(),
  status: z.enum(["inbox", "todo", "doing", "done", "cancelled"]).optional(),
  priority: z.enum(["none", "low", "medium", "high"]).optional(),
  listName: z.string().trim().min(1).max(100).optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  reminderAt: z.string().nullable().optional(),
  recurrenceRule: z
    .enum(["none", "daily", "workday", "weekly", "monthly", "yearly"])
    .optional(),
  restore: z.boolean().optional(),
});

