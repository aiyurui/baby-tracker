import { z } from "zod";

export const loginSchema = z.object({
  account: z.string().trim().min(1, "请输入用户名或邮箱"),
  password: z.string().min(6, "密码至少 6 位"),
});

export const registerSchema = z.object({
  email: z.string().trim().min(1, "请输入邮箱").email("请输入有效邮箱"),
  password: z.string().min(6, "密码至少 6 位"),
  username: z.string().trim().min(2, "请输入用户名").max(50, "用户名最多 50 个字符"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
