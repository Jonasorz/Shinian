import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shinian",
    short_name: "Shinian",
    description: "基于 Vercel 与 Neon 的个人卡片笔记与轻量任务系统",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f0e7",
    theme_color: "#f4f0e7",
    lang: "zh-CN",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
