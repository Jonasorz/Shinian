import Link from "next/link";
import styles from "../policy.module.css";

export default function PrivacyPage() {
  return (
    <main id="main-content" className={styles.page}>
      <Link className={styles.back} href="/login">
        返回登录
      </Link>
      <p className={styles.eyebrow}>隐私</p>
      <h1>你的记录只属于你的实例。</h1>
      <div className={styles.content}>
        <p>
          Shinian 不包含广告、第三方分析脚本或跨站追踪。账号、Memo
          与未来产生的任务数据保存在你自行部署的数据库中。
        </p>
        <p>
          登录 Cookie 只用于维持当前设备会话。源代码备份不应包含数据库、附件、密码或密钥。
        </p>
      </div>
    </main>
  );
}

