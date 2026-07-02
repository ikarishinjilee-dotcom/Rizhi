import { spawn } from "node:child_process";

const children = [];
let shuttingDown = false;

start("api", process.execPath, ["./node_modules/tsx/dist/cli.mjs", "./server/app/main.ts"]);
const port = process.env.RIZHI_FASTIFY_PORT ?? "8797";
const ready = await waitForApi(`http://127.0.0.1:${port}/api/v1/health`);
if (!ready) {
  console.error("API did not become healthy within 30 seconds.");
  shutdown(1);
} else {
  start("backup scheduler", process.execPath, ["./scripts/backup-scheduler.mjs"]);
}

function start(name, command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: false,
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`${name} stopped (${signal ?? code ?? "unknown"}).`);
    shutdown(code || 1);
  });
}

async function waitForApi(url) {
  for (let attempt = 0; attempt < 60 && !shuttingDown; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // API is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
  const timer = setTimeout(() => process.exit(code), 5000);
  timer.unref();
  Promise.all(children.map((child) => new Promise((resolve) => child.once("exit", resolve))))
    .finally(() => process.exit(code));
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
