import { lstat, mkdir, readlink, symlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = resolve(root, "node_modules/@dcloudio/uni-components");
const link = resolve(root, "apps/uni-app/node_modules/@dcloudio/uni-components");

async function pathState(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

const targetState = await pathState(target);
if (!targetState?.isDirectory()) {
  throw new Error(`Missing workspace dependency: ${target}`);
}

const linkState = await pathState(link);
if (linkState) {
  if (!linkState.isSymbolicLink()) {
    throw new Error(`Expected a dependency link but found a regular path: ${link}`);
  }
  const currentTarget = resolve(dirname(link), await readlink(link));
  if (currentTarget !== target) {
    throw new Error(`Dependency link points to an unexpected target: ${currentTarget}`);
  }
  process.exit(0);
}

await mkdir(dirname(link), { recursive: true });
await symlink(target, link, process.platform === "win32" ? "junction" : "dir");
console.log("Linked @dcloudio/uni-components for HBuilderX.");
