"use client";

import { RefreshCw } from "lucide-react";
import styles from "./notes.module.css";

export default function NotesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className={styles.errorPage}>
      <div className={styles.brandMark} aria-hidden="true">
        拾
      </div>
      <p className={styles.eyebrow}>暂时无法读取记录</p>
      <h1>数据库没有回应。</h1>
      <p>请确认数据库已经启动，然后重新连接。</p>
      <button onClick={reset} type="button">
        <RefreshCw aria-hidden="true" size={16} />
        重新连接
      </button>
    </main>
  );
}

