<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import uniIdPageInit from "@/uni_modules/uni-id-pages/init.js";
onLaunch(async () => {
  await uniIdPageInit();
  console.log("App Launch");
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style></style>
