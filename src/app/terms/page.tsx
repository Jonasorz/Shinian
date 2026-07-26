import Link from "next/link";
import styles from "../policy.module.css";

export default function TermsPage() {
  return (
    <main id="main-content" className={styles.page}>
      <Link className={styles.back} href="/login">
        返回登录
      </Link>
      <p className={styles.eyebrow}>使用说明</p>
      <h1>这是一个由你维护的私人空间。</h1>
      <div className={styles.content}>
        <p>
          请妥善保存管理员密码和备份。部署到公网时必须启用 HTTPS，并及时更新运行环境。
        </p>
        <p>
          当前版本用于个人记录，不提供团队协作、公开发布或多租户隔离能力。
        </p>
      </div>
    </main>
  );
}

