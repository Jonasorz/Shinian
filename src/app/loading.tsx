import styles from "./loading.module.css";

export default function Loading() {
  return (
    <main aria-busy="true" aria-label="正在加载页面" className={styles.shell}>
      <div className={styles.column}>
        <div className={styles.line} />
        <div className={styles.card} />
        <div className={styles.card} />
        <div className={styles.card} />
      </div>
    </main>
  );
}
