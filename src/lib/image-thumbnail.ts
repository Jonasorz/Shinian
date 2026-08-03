export function thumbnailDimensions(
  width: number,
  height: number,
  maxEdge = 720,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function createImageThumbnail(file: File): Promise<File | null> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") {
    return null;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const size = thumbnailDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.78);
    });
    return blob
      ? new File([blob], `thumbnail-${file.name}.webp`, {
          type: "image/webp",
        })
      : null;
  } catch {
    return null;
  }
}
