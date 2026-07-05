const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const MAX_PERSISTED_IMAGE_BYTES = 1300 * 1024;

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

function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",", 2)[1] || "";
  return Math.ceil(base64.length * 0.75);
}

export async function imageFileToPersistentUrl(file: File) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} 不是有效图片`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} 超过 12MB，请压缩后再上传`);

  const original = await readFileAsDataUrl(file);
  const image = await loadImage(original);
  let scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  let optimized = "";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法处理图片");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    optimized = canvas.toDataURL("image/webp", Math.max(0.58, 0.84 - attempt * 0.05));
    if (dataUrlBytes(optimized) <= MAX_PERSISTED_IMAGE_BYTES) break;
    scale *= 0.78;
  }
  if (dataUrlBytes(optimized) > MAX_PERSISTED_IMAGE_BYTES) {
    throw new Error(`${file.name} 压缩后仍然过大，请选择尺寸更小的图片`);
  }
  const canKeepOriginal = /image\/(?:jpeg|png|webp)/.test(file.type)
    && dataUrlBytes(original) <= MAX_PERSISTED_IMAGE_BYTES;
  return canKeepOriginal && original.length < optimized.length ? original : optimized;
}
