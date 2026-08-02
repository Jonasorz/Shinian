import Link from "next/link";
import {
  CheckSquare,
  Feather,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import styles from "./MobileNavigation.module.css";

type MobileDestination = "notes" | "tasks" | "search" | "review" | "settings";

type MobileNavigationProps = {
  active: MobileDestination;
};

const destinations = [
  { key: "notes", href: "/notes", label: "记录", icon: Feather },
  { key: "tasks", href: "/tasks", label: "任务", icon: CheckSquare },
  { key: "search", href: "/search", label: "搜索", icon: Search },
  { key: "review", href: "/review", label: "回顾", icon: Sparkles },
  { key: "settings", href: "/settings", label: "设置", icon: Settings },
] as const;

export function MobileNavigation({ active }: MobileNavigationProps) {
  return (
    <nav aria-label="移动端主要导航" className={styles.navigation}>
      {destinations.map(({ key, href, label, icon: Icon }) => (
        <Link
          aria-current={active === key ? "page" : undefined}
          className={active === key ? styles.active : undefined}
          href={href}
          key={key}
        >
          <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
