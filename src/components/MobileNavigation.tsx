"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CheckSquare,
  Feather,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import styles from "./MobileNavigation.module.css";

const destinations = [
  { key: "notes", href: "/notes", label: "记录", icon: Feather },
  { key: "tasks", href: "/tasks", label: "任务", icon: CheckSquare },
  { key: "search", href: "/search", label: "搜索", icon: Search },
  { key: "review", href: "/review", label: "回顾", icon: Sparkles },
  { key: "settings", href: "/settings", label: "设置", icon: Settings },
] as const;

export function MobileNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const active = destinations.find(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  )?.key;

  useEffect(() => {
    if (!active) return;
    for (const { href } of destinations) router.prefetch(href);
  }, [active, router]);

  const isNavigating = pendingHref !== null && pendingHref !== pathname;

  if (!active) return null;

  return (
    <nav
      aria-busy={isNavigating}
      aria-label="移动端主要导航"
      className={styles.navigation}
    >
      {destinations.map(({ key, href, label, icon: Icon }) => (
        <Link
          aria-current={active === key ? "page" : undefined}
          className={[
            active === key ? styles.active : "",
            isNavigating && pendingHref === href ? styles.pending : "",
          ]
            .filter(Boolean)
            .join(" ")}
          href={href}
          key={key}
          onClick={() => {
            if (pathname !== href) setPendingHref(href);
          }}
        >
          <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
          <span>{label}</span>
          {isNavigating && pendingHref === href ? <i aria-hidden="true" /> : null}
        </Link>
      ))}
    </nav>
  );
}
