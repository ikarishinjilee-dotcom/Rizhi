import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import { useAppDataStore } from "@/stores/appDataStore";
import { hasActiveSession } from "@/services/authService";
import "@/styles/tokens.css";
import "@/styles/global.css";

document.title = import.meta.env.VITE_APP_ENV === "test"
	? "Rizhi - 测试环境"
	: "Rizhi";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia).use(router).mount("#app");

if (hasActiveSession()) {
	useAppDataStore(pinia).init().catch((error) => {
		console.error("[Rizhi] 数据初始化失败", error);
	});
}
