# SQLite 结构化表设计

> 历史文档：SQLite 结构化方案已停止推进，仅保留为数据建模参考。

本文档定义从当前 `app_state` JSON 存储迁移到 SQLite 结构化表的目标方案。当前运行时仍使用 `server/app/db/sqliteStore.ts` 的 JSON 状态存储；本方案用于下一步分阶段落地。

## 设计目标

- 保持现有 API 响应形状不变。
- 保持导入导出格式兼容 `rizhi-local-backup`。
- 所有会影响余额的写入必须在同一个 SQLite transaction 内完成。
- 金额字段第一阶段继续使用 `REAL`，与当前前端 `number` 元单位兼容；后续再迁移到分单位整数。
- 附件、少量扩展字段可先使用 JSON 文本字段，避免一次性过度拆表。

## 表清单

第一阶段落地这些表：

- `schema_migrations`
- `users`
- `settings`
- `categories`
- `accounts`
- `assets`
- `asset_addons`
- `transactions`
- `account_flows`
- `metadata`

暂缓拆表：

- `asset_attachments`
- `addon_attachments`
- `asset_part_events`
- `account_transfers`

原因：当前业务主线不依赖独立附件查询，`assetPartEvents` 主要是旧兼容数据，转账当前仍通过 `transactions + account_flows` 表达。

## DDL 草案

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CNY',
  locale TEXT NOT NULL DEFAULT 'zh-CN',
  theme TEXT NOT NULL DEFAULT 'light',
  first_day_of_week INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('asset', 'transaction', 'account')),
  type TEXT,
  parent_id TEXT,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 999,
  color TEXT,
  icon TEXT,
  monthly_budget REAL,
  enabled INTEGER NOT NULL DEFAULT 1,
  is_system INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('asset', 'liability')),
  balance REAL NOT NULL DEFAULT 0,
  institution TEXT,
  credit_limit REAL,
  bill_day INTEGER,
  repayment_day INTEGER,
  color TEXT,
  icon TEXT,
  note TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  category_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('using', 'idle', 'transferred', 'disposed')),
  original_cost REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CNY',
  current_value REAL,
  current_value_updated_at TEXT,
  current_value_source TEXT,
  purchase_date TEXT NOT NULL,
  first_use_date TEXT,
  last_used_at TEXT,
  idle_since TEXT,
  purchase_channel TEXT,
  merchant TEXT,
  order_no TEXT,
  payment_account_id TEXT,
  purchase_transaction_id TEXT,
  transfer_date TEXT,
  transfer_amount REAL,
  transfer_account_id TEXT,
  transfer_transaction_id TEXT,
  disposed_at TEXT,
  warranty_start_date TEXT,
  warranty_end_date TEXT,
  expected_use_days INTEGER,
  notes TEXT,
  attachments_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (payment_account_id) REFERENCES accounts(id),
  FOREIGN KEY (transfer_account_id) REFERENCES accounts(id)
);

CREATE TABLE asset_addons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  name TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'expense' CHECK (direction IN ('expense', 'income')),
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CNY',
  purchase_date TEXT NOT NULL,
  merchant TEXT,
  payment_account_id TEXT,
  transaction_id TEXT,
  included_in_cost INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  attachments_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_account_id) REFERENCES accounts(id)
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  business_type TEXT,
  category_id TEXT NOT NULL,
  sub_category_id TEXT,
  category_name_snapshot TEXT,
  sub_category_name_snapshot TEXT,
  amount REAL NOT NULL,
  occurred_at TEXT NOT NULL,
  account_id TEXT NOT NULL,
  related_account_id TEXT,
  asset_id TEXT,
  addon_id TEXT,
  part_event_id TEXT,
  merchant TEXT,
  note TEXT,
  receipt_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (sub_category_id) REFERENCES categories(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (related_account_id) REFERENCES accounts(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (addon_id) REFERENCES asset_addons(id)
);

CREATE TABLE account_flows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  transaction_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  amount REAL NOT NULL,
  occurred_at TEXT NOT NULL,
  balance_after REAL NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

## 索引

```sql
CREATE INDEX idx_categories_user_domain ON categories(user_id, domain, enabled, sort);
CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE INDEX idx_accounts_user_direction ON accounts(user_id, direction, enabled);

CREATE INDEX idx_assets_user_status ON assets(user_id, status);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_purchase_transaction ON assets(purchase_transaction_id);
CREATE INDEX idx_assets_transfer_transaction ON assets(transfer_transaction_id);

CREATE INDEX idx_asset_addons_asset ON asset_addons(asset_id);
CREATE INDEX idx_asset_addons_transaction ON asset_addons(transaction_id);

CREATE INDEX idx_transactions_user_occurred ON transactions(user_id, occurred_at DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_sub_category ON transactions(sub_category_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_asset ON transactions(asset_id);
CREATE INDEX idx_transactions_addon ON transactions(addon_id);

CREATE INDEX idx_account_flows_account_occurred ON account_flows(account_id, occurred_at DESC);
CREATE INDEX idx_account_flows_transaction ON account_flows(transaction_id);
```

## JSON 到结构化字段映射

| 当前 JSON | 目标表 |
| --- | --- |
| `accounts[]` | `accounts` |
| `assets[]` | `assets` |
| `assets[].attachments` | `assets.attachments_json` |
| `assetAddons[]` | `asset_addons` |
| `assetAddons[].attachments` | `asset_addons.attachments_json` |
| `transactions[]` | `transactions` |
| `transactions[].categorySnapshot.categoryName` | `transactions.category_name_snapshot` |
| `transactions[].categorySnapshot.subCategoryName` | `transactions.sub_category_name_snapshot` |
| `accountFlows[]` | `account_flows` |
| `categories[]` | `categories` |
| `settings` | `settings` |
| `metadata[]` / `meta` | `metadata` |

## 迁移策略

第一步只做一次性迁移，不改变 API：

1. 保留当前 `app_state` 表。
2. 新增结构化表和 `schema_migrations`。
3. 启动时检测结构化表是否为空。
4. 如果为空，从 `app_state.data` 读取 JSON 并写入结构化表。
5. 继续让 API 从旧 JSON store 读写，先只验证迁移脚本。

第二步切读：

1. 新增 `structuredSqliteStore.ts`。
2. 实现 `readJsonDb()` 从结构化表组装当前 `RizhiData`。
3. `writeJsonDb()` 暂时仍可全量覆写结构化表。
4. 让现有测试全通过。

第三步切写：

1. 将资产、附加项、交易、账户、分类 repository 改成结构化 SQL 写入。
2. 逐个移除全量 `writeJsonDb()` 依赖。
3. 最后废弃 `app_state` 写入，仅保留兼容导入。

## 事务边界

必须在一个 SQLite transaction 内完成：

- 新增资产 + 购买交易 + 账户流水 + 账户余额。
- 编辑资产购买信息 + 回滚旧交易影响 + 写入新交易影响。
- 删除资产 + 删除附加项 + 解除历史交易关联。
- 新增/编辑附加项 + 交易 + 账户流水 + 账户余额。
- 新增/编辑/删除普通交易 + 账户流水 + 账户余额。
- 转账 + 两条账户流水 + 两个账户余额。
- 还款 + 两条账户流水 + 两个账户余额。
- 资产转让/撤销转让。
- 分类迁移批量更新交易分类和快照。

## 约束和规则

- `categories.domain = asset` 的分类 `type` 统一保存为 `other`。
- `categories.enabled = 0` 的分类不能用于新增或编辑业务数据。
- 被资产、账户、交易或子分类占用的分类不能删除。
- 有账户流水的账户不能删除。
- 系统生成交易不能通过普通交易接口编辑或删除。

## 第一批落地任务

1. 新增 `server/app/db/schema.ts`，集中管理 DDL。
2. 新增 `server/app/db/migrateAppState.ts`，实现 `app_state -> structured tables`。
3. 新增测试：默认数据可迁移到结构化表。
4. 新增测试：迁移后表计数和关键外键一致。
5. 暂不切换运行时读写，先让迁移脚本可重复、可验证。
# 历史资料说明（2026-07-16）

SQLite 结构化迁移已停止推进。当前数据模型以 uniCloud Schema、云函数和 Web 仓储契约为准；本文仅用于理解早期建模决策。
