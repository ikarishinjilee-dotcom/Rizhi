import { createApp } from "./app.ts";
import { initializeJsonDb } from "./db/sqliteStore.ts";

const host = process.env.RIZHI_FASTIFY_HOST ?? "127.0.0.1";
const port = Number(process.env.RIZHI_FASTIFY_PORT ?? 8797);

const app = createApp({ logger: true });
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, "Shutting down Rizhi API");
  try {
    await app.close();
    process.exitCode = 0;
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await initializeJsonDb();
  await app.listen({ host, port });
  app.log.info(`Rizhi Fastify API listening on http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
