import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const targets = {
  staging: {
    buildScript: "build:test",
    label: "TEST",
    spaceId: "env-00jy6jwd2ddo",
  },
  production: {
    buildScript: "build:production",
    label: "PRODUCTION",
    spaceId: "env-00jy6jt1yyje",
  },
};

const targetName = process.argv[2];
const target = targets[targetName];

if (!target) {
  console.error("Usage: node scripts/deploy-web.mjs <staging|production>");
  process.exit(1);
}

const cliPath = process.env.HBUILDERX_CLI
  || (process.platform === "win32" ? "C:\\HBuilderX\\cli.exe" : "");

if (!cliPath || !existsSync(cliPath)) {
  console.error("HBuilderX CLI not found. Set HBUILDERX_CLI to its absolute path.");
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const distPath = resolve("apps/web/dist");

console.log(`[Rizhi] Building ${target.label} web bundle...`);
const build = spawnSync(npmCommand, ["run", target.buildScript], {
  cwd: resolve("."),
  stdio: "inherit",
});

if (build.status !== 0) process.exit(build.status ?? 1);

console.log(`[Rizhi] Deploying ${target.label} to ${target.spaceId}...`);
const deploy = spawnSync(cliPath, [
  "hosting",
  "deploy",
  "--provider",
  "alipay",
  "--space",
  target.spaceId,
  "--source",
  distPath,
  "--prefix",
  "/",
], {
  cwd: resolve("."),
  stdio: "inherit",
});

process.exit(deploy.status ?? 1);
