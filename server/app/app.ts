import Fastify, { type FastifyInstance } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { captureDbRuntimeConfig, enterDbRuntimeConfig, type DbRuntimeConfig } from "./db/sqliteStore.ts";
import { HttpError, registerErrorHandler } from "./errors.ts";
import { registerAccountRoutes } from "./routes/accounts.ts";
import { registerAssetRoutes } from "./routes/assets.ts";
import { registerAssetAddonRoutes } from "./routes/assetAddons.ts";
import { registerCategoryRoutes } from "./routes/categories.ts";
import { registerDataRoutes } from "./routes/data.ts";
import { registerHealthRoutes } from "./routes/health.ts";
import { registerTransactionRoutes } from "./routes/transactions.ts";
import { enterUserContext, parseUserId } from "./userContext.ts";

export type CreateAppOptions = {
  logger?: boolean;
  db?: DbRuntimeConfig;
  apiToken?: string;
};

export function createApp(options: CreateAppOptions = {}): FastifyInstance {
  const dbConfig = options.db ?? captureDbRuntimeConfig();
  const app = Fastify({
    logger: options.logger ?? false,
  });

  registerDbRuntimeConfig(app, dbConfig);
  registerUserContext(app);
  registerApiToken(app, options.apiToken ?? process.env.RIZHI_API_TOKEN);
  registerJsonParser(app);
  registerCors(app);
  registerApiCachePolicy(app);
  registerErrorHandler(app);
  registerHealthRoutes(app);
  registerAccountRoutes(app);
  registerAssetRoutes(app);
  registerAssetAddonRoutes(app);
  registerCategoryRoutes(app);
  registerDataRoutes(app);
  registerTransactionRoutes(app);

  return app;
}

function registerApiToken(app: FastifyInstance, apiToken: string | undefined) {
  if (!apiToken) return;
  app.addHook("onRequest", async (request) => {
    if (request.url === "/api/v1/health") return;
    const authorization = request.headers.authorization;
    const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    const expectedBuffer = Buffer.from(apiToken);
    const suppliedBuffer = Buffer.from(supplied);
    if (
      expectedBuffer.length !== suppliedBuffer.length
      || !timingSafeEqual(expectedBuffer, suppliedBuffer)
    ) {
      throw new HttpError(401, "UNAUTHORIZED", "未授权访问");
    }
  });
}

function registerUserContext(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    const userId = parseUserId(request.headers["x-rizhi-user-id"]);
    if (!userId) throw new HttpError(400, "INVALID_USER_ID", "用户标识格式不正确");
    enterUserContext(userId);
  });
}

function registerDbRuntimeConfig(app: FastifyInstance, config: DbRuntimeConfig) {
  app.addHook("onRequest", async () => {
    enterDbRuntimeConfig(config);
  });
}

function registerApiCachePolicy(app: FastifyInstance) {
  app.addHook("onSend", async (request, reply, payload) => {
    if (request.url.startsWith("/api/v1/")) {
      reply.header("Cache-Control", "no-store");
    }
    return payload;
  });
}

function registerCors(app: FastifyInstance) {
  app.addHook("onRequest", async (_request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  });

  app.options("/*", async (_request, reply) => {
    return reply.status(204).send();
  });
}

function registerJsonParser(app: FastifyInstance) {
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_request, body, done) => {
    const text = body.toString().trim();
    if (!text) {
      done(null, {});
      return;
    }

    try {
      done(null, JSON.parse(text) as unknown);
    } catch {
      done(new HttpError(400, "VALIDATION_ERROR", "请求 JSON 格式错误"), undefined);
    }
  });
}
