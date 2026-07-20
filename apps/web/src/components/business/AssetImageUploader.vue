<template>
  <aside class="asset-uploader">
    <div class="asset-uploader__preview">
      <img v-if="coverImage" :src="coverImage" :alt="draft.name || '资产图片'" />
      <span v-else>{{ previewSymbol }}</span>
    </div>
    <strong>资产主图</strong>
    <p>支持商品图、订单截图或实拍图。上传多张后，可在资产详情页通过缩略图切换查看。</p>
    <input ref="fileInput" data-testid="asset-image-input" class="asset-uploader__file" type="file" accept="image/*" multiple @change="$emit('select-images', $event)" />
    <RButton variant="secondary" @click="fileInput?.click()">选择图片</RButton>
    <div v-if="draft.imageUrls.length" class="asset-uploader__thumbs">
      <button
        v-for="(image, index) in draft.imageUrls"
        :key="`${image}-${index}`"
        :class="{ active: draft.imageUrl === image }"
        type="button"
        @click="$emit('select-image', image)"
      >
        <img :src="image" :alt="`${draft.name || '资产'}图片${index + 1}`" />
        <span data-testid="asset-image-remove" @click.stop="$emit('remove-image', index)">×</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from "vue";
import RButton from "@/components/ui/RButton.vue";

type AssetImageDraft = {
  name: string;
  imageUrl: string;
  imageUrls: string[];
};

defineProps<{
  draft: AssetImageDraft;
  coverImage: string;
  previewSymbol: string;
}>();

defineEmits<{
  "select-images": [event: Event];
  "select-image": [image: string];
  "remove-image": [index: number];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
</script>

<style scoped>
.asset-uploader {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg-hover);
  border: 1px dashed var(--color-border-strong);
  border-radius: 14px;
}

.asset-uploader__preview {
  display: grid;
  height: 168px;
  overflow: hidden;
  place-items: center;
  color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-primary-soft), #fff);
  border-radius: var(--radius-lg);
  font-size: 42px;
  font-weight: 800;
}

.asset-uploader__preview img { width: 100%; height: 100%; object-fit: cover; }
.asset-uploader__file { display: none; }
.asset-uploader__thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); }
.asset-uploader__thumbs button {
  position: relative;
  height: 42px;
  overflow: hidden;
  padding: 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.asset-uploader__thumbs button.active { border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary-soft); }
.asset-uploader__thumbs img { width: 100%; height: 100%; object-fit: cover; }
.asset-uploader__thumbs span {
  position: absolute;
  top: 2px;
  right: 2px;
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  color: #fff;
  background: rgba(17, 24, 39, 0.72);
  border-radius: 50%;
  font-size: 12px;
  line-height: 1;
}
.asset-uploader p { margin: 0; color: var(--color-text-tertiary); font-size: var(--font-caption); line-height: 1.7; }
</style>
