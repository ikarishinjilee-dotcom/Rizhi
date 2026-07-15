import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getApiBaseUrl,
  getDataSource,
  isUniCloudDataSource,
  requireUniCloudMode,
} from "@/services/apiConfig";

describe("apiConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the configured uniCloud API URL", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "unicloud");
    vi.stubEnv("VITE_API_BASE_URL", "https://example.test/rizhi-api/api/v1/");

    expect(getDataSource()).toBe("unicloud");
    expect(isUniCloudDataSource()).toBe(true);
    expect(getApiBaseUrl()).toBe("https://example.test/rizhi-api/api/v1");
  });

  it("blocks cloud-only features outside uniCloud mode", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "indexeddb");

    expect(() => requireUniCloudMode("账户登录/注册")).toThrow("仅在 uniCloud 模式可用");
  });
});
