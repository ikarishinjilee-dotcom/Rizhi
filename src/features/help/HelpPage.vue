<template>
  <section class="help-page">
    <header class="help-header">
      <div>
        <h1>使用帮助</h1>
        <p>从常用任务开始，快速找到对应功能和数据管理入口。</p>
      </div>
    </header>

    <div class="help-grid">
      <RouterLink v-for="item in taskLinks" :key="item.path" :to="item.path" class="help-task">
        <span class="help-task__icon"><component :is="item.icon" :size="20" /></span>
        <div>
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
        </div>
        <ChevronRight :size="17" />
      </RouterLink>
    </div>

    <RCard>
      <section class="help-section">
        <div class="help-section__head">
          <h2>常见问题</h2>
          <p>当前版本采用本地优先存储，以下操作都发生在你的浏览器中。</p>
        </div>
        <div class="faq-list">
          <details v-for="item in faqItems" :key="item.question">
            <summary>{{ item.question }}</summary>
            <p>{{ item.answer }}</p>
          </details>
        </div>
      </section>
    </RCard>

    <RCard>
      <section class="help-section help-section--backup">
        <div>
          <h2>保护本地数据</h2>
          <p>浏览器数据可能因为清理缓存或更换设备而丢失，建议定期导出 JSON 备份。</p>
        </div>
        <RouterLink to="/settings/data">前往数据管理 <ChevronRight :size="16" /></RouterLink>
      </section>
    </RCard>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { Box, ChevronRight, CreditCard, DatabaseBackup, NotebookText, Tags } from "@lucide/vue";
import RCard from "@/components/ui/RCard.vue";

const taskLinks = [
  { title: "记录物品资产", description: "新增资产、维护图片、附加项和使用状态。", path: "/assets", icon: Box },
  { title: "记录收入与支出", description: "新增账单、筛选交易并查看日历统计。", path: "/ledger", icon: NotebookText },
  { title: "管理资金账户", description: "维护余额、欠款、转账和还款计划。", path: "/funds", icon: CreditCard },
  { title: "维护业务分类", description: "自定义资产、记账和账户分类。", path: "/settings/categories", icon: Tags },
  { title: "备份与恢复", description: "导出、导入或重置当前浏览器数据。", path: "/settings/data", icon: DatabaseBackup },
];

const faqItems = [
  {
    question: "为什么换一个浏览器后看不到原来的数据？",
    answer: "当前数据保存在浏览器 IndexedDB 中，不会自动同步到其他浏览器或设备。请先在数据管理中导出备份，再在新环境中导入。",
  },
  {
    question: "购买资产后，记账和账户余额会同步吗？",
    answer: "会。通过新增资产、附加项或记账表单产生的关联交易，会同步更新对应账户余额和资金流水。",
  },
  {
    question: "为什么某些分类或账户不能删除？",
    answer: "存在关联账单或资金流水时，系统会阻止删除，以免破坏历史数据。可以先迁移分类，或将账户停用后保留历史记录。",
  },
  {
    question: "过保、还款和闲置提醒在哪里设置？",
    answer: "点击顶部通知图标，再打开提醒设置，即可修改三类提醒的天数阈值。",
  },
];
</script>

<style scoped>
.help-page {
  display: grid;
  gap: var(--space-5);
  max-width: 1180px;
  margin: 0 auto;
}

.help-header h1,
.help-header p,
.help-section h2,
.help-section p {
  margin: 0;
}

.help-header h1 {
  font-size: var(--font-page-title);
}

.help-header p,
.help-section p {
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-table);
  line-height: 1.7;
}

.help-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.help-task {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 18px;
  gap: var(--space-3);
  align-items: center;
  min-height: 94px;
  padding: var(--space-4);
  color: var(--color-text-primary);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.help-task:hover,
.help-task:focus-visible {
  border-color: #9ec5ff;
  box-shadow: 0 10px 24px rgba(22, 119, 255, 0.1);
  outline: none;
  transform: translateY(-2px);
}

.help-task__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-lg);
}

.help-task strong {
  font-size: var(--font-card-title);
}

.help-task p {
  margin: 4px 0 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-caption);
  line-height: 1.55;
}

.help-task > svg {
  color: var(--color-text-tertiary);
}

.help-section {
  padding: var(--space-5);
}

.help-section__head {
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.help-section h2 {
  font-size: var(--font-section-title);
}

.faq-list details {
  border-bottom: 1px solid var(--color-border);
}

.faq-list details:last-child {
  border-bottom: 0;
}

.faq-list summary {
  padding: var(--space-4) 0;
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: var(--font-table);
  font-weight: 700;
}

.faq-list details p {
  margin: 0;
  padding: 0 0 var(--space-4);
}

.help-section--backup {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
}

.help-section--backup a {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-primary);
  font-size: var(--font-table);
  font-weight: 700;
  white-space: nowrap;
}

@media (max-width: 1000px) {
  .help-grid {
    grid-template-columns: 1fr;
  }
}
</style>
