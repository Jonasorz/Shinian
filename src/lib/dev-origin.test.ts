import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("local development origins", () => {
  it("keeps the 127.0.0.1 HMR connection allowed", () => {
    expect(nextConfig.allowedDevOrigins).toContain("127.0.0.1");
  });
});
