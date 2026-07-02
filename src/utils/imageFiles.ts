const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片格式无法解析"));
    image.src = url;
  });
}

export async function imageFileToPersistentUrl(file: File) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} 不是有效图片`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} 超过 12MB，请压缩后再上传`);

  const original = await readFileAsDataUrl(file);
  if (file.type === "image/svg+xml" || file.type === "image/gif") return original;

  const image = await loadImage(original);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法处理图片");
  context.drawImage(image, 0, 0, width, height);

  const optimized = canvas.toDataURL("image/webp", 0.82);
  return optimized.length < original.length ? optimized : original;
}
