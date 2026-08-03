import { describe, expect, it } from "vitest";
import { thumbnailDimensions } from "./image-thumbnail";

describe("thumbnail dimensions", () => {
  it("fits landscape and portrait images without enlarging small images", () => {
    expect(thumbnailDimensions(4000, 3000)).toEqual({ width: 720, height: 540 });
    expect(thumbnailDimensions(1000, 2000)).toEqual({ width: 360, height: 720 });
    expect(thumbnailDimensions(320, 240)).toEqual({ width: 320, height: 240 });
  });
});
