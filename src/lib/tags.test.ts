import { describe, expect, it } from "vitest";
import { extractTags, formatTag } from "./tags";

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
});
