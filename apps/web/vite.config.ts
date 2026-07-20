import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    setupFiles: ["./src/test/setup.ts"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/echarts/") || id.includes("/vue-echarts/")) return "vendor-echarts";
          if (id.includes("/naive-ui/")) return "vendor-naive-ui";
          if (id.includes("/@vue/") || id.includes("/vue/")) return "vendor-vue";
          if (id.includes("/@lucide/")) return "vendor-icons";
          return "vendor-common";
        },
      },
    },
  },
});
