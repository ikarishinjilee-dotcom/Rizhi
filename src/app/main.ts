import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import { useAppDataStore } from "@/stores/appDataStore";
import "@/styles/tokens.css";
import "@/styles/global.css";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia).use(router).mount("#app");

useAppDataStore(pinia).init().catch((error) => {
  console.error("[Rizhi] 本地数据库初始化失败", error);
});
