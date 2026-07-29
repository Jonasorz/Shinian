"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Download,
  Feather,
  FileCode,
  FileText,
  FolderArchive,
  LogOut,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import type { ImportBatch } from "@/lib/db";
import styles from "@/app/settings/settings.module.css";

type SettingsWorkspaceProps = {
  memoCount: number;
  taskCount: number;
  username: string;
  initialBatches: ImportBatch[];
};

type PreviewStats = {
  memoCount: number;
  taskCount: number;
  tagsFound: string[];
  listsFound: string[];
};

export function SettingsWorkspace({
  memoCount: initialMemoCount,
  taskCount: initialTaskCount,
  username,
  initialBatches,
}: SettingsWorkspaceProps) {
  const router = useRouter();

  const [memoCount, setMemoCount] = useState(initialMemoCount);
  const [taskCount, setTaskCount] = useState(initialTaskCount);
  const [batches, setBatches] = useState<ImportBatch[]>(initialBatches);

  // Import state
  const [importSource, setImportSource] = useState<
    "flomo" | "ticktick" | "shinian_json"
  >("flomo");
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [previewStats, setPreviewStats] = useState<PreviewStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setNotice("正在读取并分析文件...");
    setPreviewStats(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setFileContent(content);

      // Perform preview request
      try {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: importSource,
            fileContent: content,
            action: "preview",
          }),
        });

        const data = (await res.json()) as {
          previewStats?: PreviewStats;
          error?: string;
        };

        if (!res.ok) {
          setNotice(data.error ?? "文件分析失败");
          return;
        }

        setPreviewStats(data.previewStats ?? null);
        setNotice("文件可导入，请核对预览信息后提交");
      } catch {
        setNotice("文件格式有误，无法解析");
      }
    };
    reader.readAsText(file);
  }

  async function handleCommitImport() {
    if (!fileContent || isProcessing) return;

    setIsProcessing(true);
    setNotice("正在进行安全批量导入...");

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: importSource,
          fileContent,
          action: "commit",
        }),
      });

      const data = (await res.json()) as {
        batch?: ImportBatch;
        message?: string;
        error?: string;
      };

      if (!res.ok) throw new Error(data.error ?? "导入失败");

      if (data.batch) {
        setBatches((prev) => [data.batch!, ...prev]);
        setMemoCount((prev) => prev + data.batch!.memoCount);
        setTaskCount((prev) => prev + data.batch!.taskCount);
      }

      setPreviewStats(null);
      setFileContent("");
      setFileName("");
      setNotice(data.message ?? "数据导入成功！");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "导入提交失败");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleUndoBatch(batchId: string) {
    setNotice("正在回滚撤销该批次...");
    try {
      const res = await fetch("/api/import/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });

      if (!res.ok) throw new Error("撤销失败");

      const undoneBatch = batches.find((b) => b.id === batchId);
      if (undoneBatch) {
        setMemoCount((prev) => Math.max(0, prev - undoneBatch.memoCount));
        setTaskCount((prev) => Math.max(0, prev - undoneBatch.taskCount));
      }

      setBatches((prev) => prev.filter((b) => b.id !== batchId));
      setNotice("该批次导入的所有数据已成功彻底回滚！");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "无法撤销此批次");
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className={styles.shell}>
      {/* Sidebar for Desktop */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">
            拾
          </div>
          <span>Shinian</span>
        </div>

        <nav aria-label="主要导航" className={styles.nav}>
          <a href="/notes">
            <Feather aria-hidden="true" size={17} strokeWidth={1.7} />
            记录
          </a>
          <a href="/tasks">
            <CheckSquare aria-hidden="true" size={17} strokeWidth={1.7} />
            任务
          </a>
          <a href="/search">
            <Search aria-hidden="true" size={17} strokeWidth={1.7} />
            搜索
          </a>
          <a href="/review">
            <Sparkles aria-hidden="true" size={17} strokeWidth={1.7} />
            回顾
          </a>
          <a aria-current="page" className={styles.navActive} href="/settings">
            <span className={styles.activeDot} aria-hidden="true" />
            <Settings aria-hidden="true" size={17} strokeWidth={1.7} />
            设置与数据
          </a>
        </nav>

        <div className={styles.sidebarFooter}>
          <div>
            <span>私人空间</span>
            <strong>{username}</strong>
          </div>
          <button aria-label="退出登录" onClick={logout} type="button">
            <LogOut aria-hidden="true" size={17} strokeWidth={1.7} />
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main id="main-content" className={styles.main}>
        {/* Mobile Header Navigation */}
        <header className={styles.mobileHeader}>
          <div className={styles.mobileBrand}>
            <div className={styles.brandMark} aria-hidden="true">
              拾
            </div>
            <span>Shinian</span>
          </div>
          <div className={styles.mobileNav}>
            <a href="/notes">记录</a>
            <a href="/tasks">任务</a>
            <a href="/search">搜索</a>
            <a href="/review">回顾</a>
            <a className={styles.mobileNavActive} href="/settings">
              设置
            </a>
          </div>
          <button aria-label="退出登录" onClick={logout} type="button">
            <LogOut aria-hidden="true" size={18} />
          </button>
        </header>

        <div className={styles.contentColumn}>
          <div className={styles.pageHeader}>
            <p className={styles.eyebrow}>自主掌控</p>
            <h1>设置与数据管理</h1>
          </div>

          {notice ? (
            <div
              style={{
                marginBottom: "20px",
                padding: "10px 16px",
                borderRadius: "var(--radius-control)",
                background: "var(--accent-soft)",
                color: "var(--accent-strong)",
                fontSize: "13px",
                fontWeight: 500,
              }}
              aria-live="polite"
            >
              {notice}
            </div>
          ) : null}

          {/* Database Metrics */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Memo 笔记总数</div>
              <div className={styles.statValue}>{memoCount} 条</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Task 任务总数</div>
              <div className={styles.statValue}>{taskCount} 条</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>主数据库</div>
              <div className={styles.statValue} style={{ fontSize: "20px" }}>
                PostgreSQL
              </div>
            </div>
          </div>

          {/* History Data Importer */}
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <Upload size={20} style={{ color: "var(--accent)" }} />
              <h2>历史数据导入 (flomo & 滴答清单)</h2>
            </div>
            <p className={styles.sectionDescription}>
              支持无缝从 flomo 导出的 HTML 文件、滴答清单 (TickTick) 导出的 CSV 文件或 Shinian 备份 JSON 导入历史数据。包含预检预览与一键全批次撤销支持。
            </p>

            <div className={styles.importForm}>
              <div className={styles.importSourceSelector}>
                <button
                  className={`${styles.sourceOption} ${
                    importSource === "flomo" ? styles.activeSourceOption : ""
                  }`}
                  onClick={() => {
                    setImportSource("flomo");
                    setPreviewStats(null);
                  }}
                  type="button"
                >
                  <Feather size={14} />
                  flomo (HTML 导出)
                </button>
                <button
                  className={`${styles.sourceOption} ${
                    importSource === "ticktick" ? styles.activeSourceOption : ""
                  }`}
                  onClick={() => {
                    setImportSource("ticktick");
                    setPreviewStats(null);
                  }}
                  type="button"
                >
                  <CheckSquare size={14} />
                  滴答清单 (CSV 导出)
                </button>
                <button
                  className={`${styles.sourceOption} ${
                    importSource === "shinian_json"
                      ? styles.activeSourceOption
                      : ""
                  }`}
                  onClick={() => {
                    setImportSource("shinian_json");
                    setPreviewStats(null);
                  }}
                  type="button"
                >
                  <FileCode size={14} />
                  Shinian 备份 (JSON)
                </button>
              </div>

              <label className={styles.fileDropzone}>
                <Upload size={24} />
                <span>
                  {fileName
                    ? `已选择文件: ${fileName}`
                    : `点击或拖拽上传 ${
                        importSource === "flomo"
                          ? ".html"
                          : importSource === "ticktick"
                          ? ".csv"
                          : ".json"
                      } 文件`}
                </span>
                <input
                  accept={
                    importSource === "flomo"
                      ? ".html,.htm"
                      : importSource === "ticktick"
                      ? ".csv"
                      : ".json"
                  }
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                  type="file"
                />
              </label>

              {/* Preview Box */}
              {previewStats ? (
                <div className={styles.previewCard}>
                  <div className={styles.previewTitle}>解析预览成功：</div>
                  <div>包含 Memo 笔记：{previewStats.memoCount} 条</div>
                  <div>包含 Task 任务：{previewStats.taskCount} 条</div>
                  {previewStats.tagsFound.length > 0 ? (
                    <div>检测到标签：{previewStats.tagsFound.join(", ")}</div>
                  ) : null}
                  {previewStats.listsFound.length > 0 ? (
                    <div>检测到清单：{previewStats.listsFound.join(", ")}</div>
                  ) : null}

                  <div style={{ marginTop: "12px" }}>
                    <button
                      className={styles.exportButton}
                      disabled={isProcessing}
                      onClick={handleCommitImport}
                      type="button"
                    >
                      确认导入
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Import Batch History & Undo */}
            {batches.length > 0 ? (
              <div style={{ marginTop: "24px" }}>
                <h3 style={{ fontSize: "14px", margin: "0 0 10px" }}>
                  历史导入批次 ({batches.length})
                </h3>
                <div className={styles.batchList}>
                  {batches.map((batch) => (
                    <div key={batch.id} className={styles.batchItem}>
                      <div>
                        <strong>
                          来源：
                          {batch.source === "flomo"
                            ? "flomo HTML"
                            : batch.source === "ticktick"
                            ? "滴答清单 CSV"
                            : "Shinian JSON"}
                        </strong>
                        <span
                          style={{
                            marginLeft: "12px",
                            color: "var(--ink-muted)",
                          }}
                        >
                          ({batch.memoCount} 笔记, {batch.taskCount} 任务) ·{" "}
                          {new Date(batch.createdAt).toLocaleString("zh-CN")}
                        </span>
                      </div>
                      <button
                        className={styles.undoButton}
                        onClick={() => handleUndoBatch(batch.id)}
                        type="button"
                      >
                        <RotateCcw size={12} style={{ marginRight: "4px" }} />
                        撤销此批次
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {/* Obsidian Export Card */}
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <FolderArchive size={20} style={{ color: "var(--accent)" }} />
              <h2>Obsidian 单向 Markdown 镜像</h2>
            </div>
            <p className={styles.sectionDescription}>
              一键生成兼容 Obsidian 仓库的 Markdown 文件压缩包（ZIP）。解压后可直接放置于您的 Obsidian Vault 目录中使用。
            </p>
            <div className={styles.actionButtons}>
              <a
                className={styles.exportButton}
                download
                href="/api/export?format=markdown"
              >
                <Download size={16} />
                导出 Obsidian Markdown (.zip)
              </a>
            </div>
          </section>

          {/* JSON Backup Card */}
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <FileCode size={20} style={{ color: "var(--accent)" }} />
              <h2>全量 JSON 数据备份</h2>
            </div>
            <p className={styles.sectionDescription}>
              导出完整的数据库原始结构（含全部 Memo 记录与 Task 描述）。
            </p>
            <div className={styles.actionButtons}>
              <a
                className={styles.secondaryExportButton}
                download
                href="/api/export?format=json"
              >
                <FileText size={16} />
                导出全量 JSON 备份 (.json)
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
