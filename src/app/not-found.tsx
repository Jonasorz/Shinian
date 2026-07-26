import Link from "next/link";
import styles from "./static.module.css";

export default function NotFound() {
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.mark} aria-hidden="true">
        拾
      </div>
      <p className={styles.eyebrow}>404</p>
      <h1>这里没有留下记录。</h1>
      <p>页面可能已经移动，或者链接不完整。</p>
      <Link href="/">回到 Shinian</Link>
    </main>
  );
}

