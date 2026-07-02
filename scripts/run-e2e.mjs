import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import process from "node:process";

const host = "127.0.0.1";
const port = 5173;
const baseUrl = `http://${host}:${port}`;

function waitForServer(url, timeoutMs = 60_000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tick = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(tick, 500);
      });

      request.setTimeout(2_000, () => {
        request.destroy();
      });
    };

    tick();
  });
}

function stopProcessTree(child) {
  if (!child?.pid) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
}

function runCommand(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

const vite = spawn(
  process.execPath,
  ["./node_modules/vite/bin/vite.js", "--host", host, "--port", String(port), "--strictPort"],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  },
);

vite.stdout.on("data", (chunk) => process.stdout.write(chunk));
vite.stderr.on("data", (chunk) => process.stderr.write(chunk));

let exitCode = 1;

try {
  await waitForServer(`${baseUrl}/assets`);
  exitCode = await runCommand(
    process.execPath,
    ["./node_modules/@playwright/test/cli.js", "test"],
    {
      ...process.env,
      RIZHI_E2E_EXTERNAL_SERVER: "1",
    },
  );
} finally {
  stopProcessTree(vite);
}

process.exit(exitCode);
