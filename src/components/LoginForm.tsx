"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import styles from "@/app/login/login.module.css";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("请输入用户名");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "无法登录，请稍后重试");
        return;
      }

      router.replace("/notes");
      router.refresh();
    } catch {
      setError("无法连接到 Shinian，请检查网络");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <label>
        <span>用户名</span>
        <input
          autoComplete="username"
          autoFocus
          name="username"
          onChange={(event) => setUsername(event.target.value)}
          type="text"
          value={username}
        />
      </label>

      <label>
        <span>密码</span>
        <input
          autoComplete="current-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </label>

      <div className={styles.formStatus} aria-live="polite">
        {error ? <p>{error}</p> : <span>凭证只用于你的私人实例</span>}
      </div>

      <button disabled={isSubmitting} type="submit">
        <span>{isSubmitting ? "正在进入" : "进入 Shinian"}</span>
        <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
      </button>
    </form>
  );
}

