import { spawn } from "node:child_process";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const children = [];
const rootDir = process.cwd();
const webDir = path.join(rootDir, "apps", "web");
const webRequire = createRequire(path.join(webDir, "package.json"));
const viteCli = path.join(path.dirname(webRequire.resolve("vite/package.json")), "bin", "vite.js");
const apiHealthUrl = "http://127.0.0.1:8797/api/v1/health";
const frontendUrl = "http://127.0.0.1:5173/";

function start(name, command, args, env = {}, cwd = rootDir) {
  const child = spawn(command, args, {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
    shell: false,
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code && !isShuttingDown) {
      console.error(`${name} exited with code ${code}`);
      shutdown(code);
    }
  });
}

let isShuttingDown = false;

function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(code), 300);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (await isReachable(apiHealthUrl)) {
  console.log(`api already running: ${apiHealthUrl}`);
} else {
  start("api", process.execPath, ["./node_modules/tsx/dist/cli.mjs", "./server/app/main.ts"]);
}

if (await isReachable(frontendUrl)) {
  console.log(`frontend already running: ${frontendUrl}`);
} else {
  start(
    "frontend",
    process.execPath,
    [viteCli, "--host", "127.0.0.1", "--port", "5173"],
    {
      VITE_DATA_SOURCE: "http",
      VITE_API_BASE_URL: "http://127.0.0.1:8797/api/v1",
    },
    webDir,
  );
}

if (!children.length) {
  console.log("Rizhi dev services are already running.");
} else {
  console.log("Rizhi dev services started. Press Ctrl+C to stop services started by this command.");
}

function isReachable(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode ? response.statusCode < 500 : false);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
}
