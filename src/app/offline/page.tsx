import Link from "next/link";
import styles from "../static.module.css";

export default function OfflinePage() {
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.mark} aria-hidden="true">
        拾
      </div>
      <p className={styles.eyebrow}>暂时离线</p>
      <h1>网络回来后，再继续记录。</h1>
      <p>
        如果记录页已经打开，未发送的内容会保存在这台设备上。重新联网后可以继续提交。
      </p>
      <Link href="/notes">重新连接</Link>
    </main>
  );
}

