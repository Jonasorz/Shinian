import { describe, expect, it } from "vitest";
import { buildTagTree, extractTags, formatTag } from "./tags";

describe("tags utility", () => {
  it("extracts simple tags from text", () => {
    const text = "今天完成 #MVP 开发，感觉非常满意！#Shinian";
    expect(extractTags(text)).toEqual(["#MVP", "#Shinian"]);
  });

  it("extracts nested multi-level tags", () => {
    const text = "正在研究 #产品/个人系统 以及 #技术/前端 方面的方案。";
    expect(extractTags(text)).toEqual(["#产品/个人系统", "#技术/前端"]);
  });

  it("deduplicates identical tags", () => {
    const text = "#学习 #项目 #学习";
    expect(extractTags(text)).toEqual(["#学习", "#项目"]);
  });

  it("handles punctuation attached at the end of tags", () => {
    const text = "记得检查 #部署, 以及 #测试!";
    expect(extractTags(text)).toEqual(["#部署", "#测试"]);
  });

  it("formats tag with leading hash", () => {
    expect(formatTag("工作")).toBe("#工作");
    expect(formatTag("#工作")).toBe("#工作");
    expect(formatTag("")).toBe("");
  });

  it("builds a hierarchical tag tree with counts", () => {
    const tags = [
      { tag: "#工作/项目A", count: 3 },
      { tag: "#工作/项目B", count: 2 },
      { tag: "#读书", count: 4 },
    ];

    const tree = buildTagTree(tags);
    expect(tree).toHaveLength(2);

    const workNode = tree.find((n) => n.name === "工作");
    expect(workNode).toBeDefined();
    expect(workNode?.fullTag).toBe("#工作");
    expect(workNode?.count).toBe(5); // 3 + 2
    expect(workNode?.children).toHaveLength(2);

    expect(workNode?.children[0].name).toBe("项目A");
    expect(workNode?.children[0].count).toBe(3);
    expect(workNode?.children[1].name).toBe("项目B");
    expect(workNode?.children[1].count).toBe(2);

    const readNode = tree.find((n) => n.name === "读书");
    expect(readNode).toBeDefined();
    expect(readNode?.count).toBe(4);
    expect(readNode?.children).toHaveLength(0);
  });

  it("retains system task tags like #任务 and #待办 in the tag tree", () => {
    const tags = [
      { tag: "#生活/装修", count: 1 },
      { tag: "#任务", count: 1 },
      { tag: "#待办", count: 2 },
    ];

    const tree = buildTagTree(tags);
    expect(tree).toHaveLength(3);
    expect(tree.some((n) => n.fullTag === "#任务")).toBe(true);
    expect(tree.some((n) => n.fullTag === "#待办")).toBe(true);
    expect(tree.some((n) => n.fullTag === "#生活")).toBe(true);
  });
});
