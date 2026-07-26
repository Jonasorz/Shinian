import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { currentUser } from "@/lib/session";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "登录",
};

export default async function LoginPage() {
  if (await currentUser()) {
    redirect("/notes");
  }

  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.intro} aria-labelledby="login-heading">
        <div className={styles.brandRow}>
          <div className={styles.mark} aria-hidden="true">
            拾
          </div>
          <span>Shinian</span>
        </div>

        <div className={styles.statement}>
          <p className={styles.kicker}>写给未来的自己</p>
          <h1 id="login-heading">
            先记下来，
            <br />
            意义会慢慢浮现。
          </h1>
          <p className={styles.description}>
            一个只属于你的记录空间。没有信息流，也没有旁观者。
          </p>
        </div>
      </section>

      <section className={styles.loginArea} aria-label="登录表单">
        <div className={styles.formFrame}>
          <p className={styles.formLabel}>回到你的记录</p>
          <LoginForm />
        </div>

        <footer className={styles.footer}>
          <span>私人部署</span>
          <span aria-hidden="true">·</span>
          <Link href="/privacy">隐私</Link>
          <Link href="/terms">使用说明</Link>
        </footer>
      </section>
    </main>
  );
}

