import { describe, expect, it } from "vitest";
import {
  parseFlomoHtml,
  parseShinianJson,
  parseTickTickCsv,
} from "./importers";

describe("flomo HTML importer", () => {
  it("parses flomo HTML memo cards correctly", () => {
    const html = `
      <div class="memo">
        <div class="time">2026-07-20 12:00:00</div>
        <div class="content"><p>学习 #TypeScript 和 #Nextjs 的核心概念</p></div>
      </div>
      <div class="memo">
        <div class="time">2026-07-21 15:30:00</div>
        <div class="content"><p>思考个人云系统的 #架构 设计</p></div>
      </div>
    `;

    const result = parseFlomoHtml(html);
    expect(result.source).toBe("flomo");
    expect(result.memos.length).toBe(2);
    expect(result.memos[0]!.content).toBe("学习 #TypeScript 和 #Nextjs 的核心概念");
    expect(result.previewStats.tagsFound).toContain("#TypeScript");
    expect(result.previewStats.tagsFound).toContain("#架构");
  });

  it("maps image paths from a flomo export folder to their memo", () => {
    const html = `
      <div class="memo">
        <div class="time">2026-05-21 20:52:20</div>
        <div class="content"><p>带图片的记录 #日记</p></div>
        <div class="files">
          <img src="file/2026-05-21/1212755/photo%201.jpg" alt="memo image" />
          <img src="file/2026-05-21/1212755/photo2.png" alt="memo image" />
        </div>
      </div>
      <div class="memo">
        <div class="time">2026-05-22 10:00:00</div>
        <div class="content"><p>下一条记录</p></div>
        <div class="files"></div>
      </div>
    `;

    const result = parseFlomoHtml(html);
    expect(result.memos).toHaveLength(2);
    expect(result.memos[0]!.attachmentPaths).toEqual([
      "file/2026-05-21/1212755/photo 1.jpg",
      "file/2026-05-21/1212755/photo2.png",
    ]);
    expect(result.memos[1]!.attachmentPaths).toEqual([]);
    expect(result.previewStats.attachmentCount).toBe(2);
  });
});

describe("TickTick CSV importer", () => {
  it("parses TickTick CSV columns properly", () => {
    const csv = `
Title,Content,List Name,Due Date,Priority,Status
"完成项目上线","连接 Neon 数据库","工作","2026-07-30","High","0"
"买咖啡","","个人","2026-07-28","Low","2"
    `.trim();

    const result = parseTickTickCsv(csv);
    expect(result.source).toBe("ticktick");
    expect(result.tasks.length).toBe(2);

    expect(result.tasks[0]!.title).toBe("完成项目上线");
    expect(result.tasks[0]!.description).toBe("连接 Neon 数据库");
    expect(result.tasks[0]!.listName).toBe("工作");
    expect(result.tasks[0]!.priority).toBe("high");
    expect(result.tasks[0]!.status).toBe("todo");

    expect(result.tasks[1]!.title).toBe("买咖啡");
    expect(result.tasks[1]!.status).toBe("done");
  });
});

describe("Shinian JSON importer", () => {
  it("parses Shinian JSON format correctly", () => {
    const json = JSON.stringify({
      memos: [{ content: "旧记录 #笔记" }],
      tasks: [{ title: "旧任务", listName: "工作" }],
    });

    const result = parseShinianJson(json);
    expect(result.source).toBe("shinian_json");
    expect(result.memos.length).toBe(1);
    expect(result.tasks.length).toBe(1);
  });
});
