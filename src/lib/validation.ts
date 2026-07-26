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

