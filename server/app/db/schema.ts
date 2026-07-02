import type { DatabaseSync } from "node:sqlite";

export const structuredMigrationVersion = 1;
export const structuredMigrationName = "app_state_to_structured_tables";

export function ensureStructuredSchema(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      extra_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'CNY',
      locale TEXT NOT NULL DEFAULT 'zh-CN',
      theme TEXT NOT NULL DEFAULT 'light',
      first_day_of_week INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      extra_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS categories (
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
      extra_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS accounts (
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
      extra_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      category_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('using', 'idle', 'transferred', 'disposed')),
      original_cost REAL NOT NULL DEFAULT 0,
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
      extra_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS asset_addons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      name TEXT NOT NULL,
      direction TEXT NOT NULL DEFAULT 'expense' CHECK (direction IN ('expense', 'income')),
      type TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
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
      extra_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS asset_part_events (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      occurred_at TEXT,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      business_type TEXT,
      category_id TEXT NOT NULL,
      sub_category_id TEXT,
      category_name_snapshot TEXT,
      sub_category_name_snapshot TEXT,
      amount REAL NOT NULL DEFAULT 0,
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
      extra_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS account_flows (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      transaction_id TEXT,
      transfer_id TEXT,
      direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
      amount REAL NOT NULL DEFAULT 0,
      occurred_at TEXT NOT NULL,
      balance_after REAL NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      extra_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_categories_user_domain ON categories(user_id, domain, enabled, sort);
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_user_direction ON accounts(user_id, direction, enabled);
    CREATE INDEX IF NOT EXISTS idx_assets_user_status ON assets(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
    CREATE INDEX IF NOT EXISTS idx_assets_purchase_transaction ON assets(purchase_transaction_id);
    CREATE INDEX IF NOT EXISTS idx_assets_transfer_transaction ON assets(transfer_transaction_id);
    CREATE INDEX IF NOT EXISTS idx_asset_addons_asset ON asset_addons(asset_id);
    CREATE INDEX IF NOT EXISTS idx_asset_addons_transaction ON asset_addons(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_asset_part_events_asset ON asset_part_events(asset_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_occurred ON transactions(user_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_sub_category ON transactions(sub_category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_asset ON transactions(asset_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_addon ON transactions(addon_id);
    CREATE INDEX IF NOT EXISTS idx_account_flows_account_occurred ON account_flows(account_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_account_flows_transaction ON account_flows(transaction_id);
  `);
}

export function ensureRelationshipConstraints(database: DatabaseSync) {
  database.exec(`
    DROP TRIGGER IF EXISTS assets_delete_guard;

    CREATE TRIGGER IF NOT EXISTS assets_category_insert_guard
    BEFORE INSERT ON assets
    WHEN NOT EXISTS (
      SELECT 1 FROM categories WHERE id = NEW.category_id AND domain = 'asset'
    )
    BEGIN
      SELECT RAISE(ABORT, 'ASSET_CATEGORY_NOT_FOUND');
    END;

    CREATE TRIGGER IF NOT EXISTS assets_category_update_guard
    BEFORE UPDATE OF category_id ON assets
    WHEN NOT EXISTS (
      SELECT 1 FROM categories WHERE id = NEW.category_id AND domain = 'asset'
    )
    BEGIN
      SELECT RAISE(ABORT, 'ASSET_CATEGORY_NOT_FOUND');
    END;

    CREATE TRIGGER IF NOT EXISTS asset_addons_asset_insert_guard
    BEFORE INSERT ON asset_addons
    WHEN NOT EXISTS (SELECT 1 FROM assets WHERE id = NEW.asset_id)
    BEGIN
      SELECT RAISE(ABORT, 'ADDON_ASSET_NOT_FOUND');
    END;

    CREATE TRIGGER IF NOT EXISTS asset_addons_asset_update_guard
    BEFORE UPDATE OF asset_id ON asset_addons
    WHEN NOT EXISTS (SELECT 1 FROM assets WHERE id = NEW.asset_id)
    BEGIN
      SELECT RAISE(ABORT, 'ADDON_ASSET_NOT_FOUND');
    END;

    CREATE TRIGGER IF NOT EXISTS asset_part_events_asset_insert_guard
    BEFORE INSERT ON asset_part_events
    WHEN NOT EXISTS (SELECT 1 FROM assets WHERE id = NEW.asset_id)
    BEGIN
      SELECT RAISE(ABORT, 'PART_EVENT_ASSET_NOT_FOUND');
    END;

    CREATE TRIGGER IF NOT EXISTS account_flows_account_insert_guard
    BEFORE INSERT ON account_flows
    WHEN NOT EXISTS (SELECT 1 FROM accounts WHERE id = NEW.account_id)
    BEGIN
      SELECT RAISE(ABORT, 'FLOW_ACCOUNT_NOT_FOUND');
    END;

    CREATE TRIGGER IF NOT EXISTS transactions_asset_insert_guard
    BEFORE INSERT ON transactions
    WHEN NEW.asset_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM assets WHERE id = NEW.asset_id)
    BEGIN
      SELECT RAISE(ABORT, 'TRANSACTION_ASSET_NOT_FOUND');
    END;

    CREATE TRIGGER IF NOT EXISTS transactions_addon_insert_guard
    BEFORE INSERT ON transactions
    WHEN NEW.addon_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM asset_addons WHERE id = NEW.addon_id)
    BEGIN
      SELECT RAISE(ABORT, 'TRANSACTION_ADDON_NOT_FOUND');
    END;

    CREATE TRIGGER IF NOT EXISTS categories_asset_delete_guard
    BEFORE DELETE ON categories
    WHEN EXISTS (SELECT 1 FROM assets WHERE category_id = OLD.id)
    BEGIN
      SELECT RAISE(ABORT, 'CATEGORY_IN_USE');
    END;

    CREATE TRIGGER IF NOT EXISTS assets_delete_guard
    BEFORE DELETE ON assets
    WHEN EXISTS (SELECT 1 FROM asset_addons WHERE asset_id = OLD.id)
      OR EXISTS (SELECT 1 FROM asset_part_events WHERE asset_id = OLD.id)
    BEGIN
      SELECT RAISE(ABORT, 'ASSET_IN_USE');
    END;

    CREATE TRIGGER IF NOT EXISTS assets_transactions_detach
    AFTER DELETE ON assets
    BEGIN
      UPDATE transactions
      SET asset_id = NULL
      WHERE asset_id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS accounts_delete_guard
    BEFORE DELETE ON accounts
    WHEN EXISTS (SELECT 1 FROM account_flows WHERE account_id = OLD.id)
    BEGIN
      SELECT RAISE(ABORT, 'ACCOUNT_IN_USE');
    END;

    CREATE TRIGGER IF NOT EXISTS categories_owner_guard
    BEFORE INSERT ON categories
    WHEN EXISTS (SELECT 1 FROM categories WHERE id = NEW.id AND user_id <> NEW.user_id)
    BEGIN SELECT RAISE(ABORT, 'RECORD_ID_OWNED_BY_ANOTHER_USER'); END;

    CREATE TRIGGER IF NOT EXISTS accounts_owner_guard
    BEFORE INSERT ON accounts
    WHEN EXISTS (SELECT 1 FROM accounts WHERE id = NEW.id AND user_id <> NEW.user_id)
    BEGIN SELECT RAISE(ABORT, 'RECORD_ID_OWNED_BY_ANOTHER_USER'); END;

    CREATE TRIGGER IF NOT EXISTS assets_owner_guard
    BEFORE INSERT ON assets
    WHEN EXISTS (SELECT 1 FROM assets WHERE id = NEW.id AND user_id <> NEW.user_id)
    BEGIN SELECT RAISE(ABORT, 'RECORD_ID_OWNED_BY_ANOTHER_USER'); END;

    CREATE TRIGGER IF NOT EXISTS asset_addons_owner_guard
    BEFORE INSERT ON asset_addons
    WHEN EXISTS (SELECT 1 FROM asset_addons WHERE id = NEW.id AND user_id <> NEW.user_id)
    BEGIN SELECT RAISE(ABORT, 'RECORD_ID_OWNED_BY_ANOTHER_USER'); END;

    CREATE TRIGGER IF NOT EXISTS transactions_owner_guard
    BEFORE INSERT ON transactions
    WHEN EXISTS (SELECT 1 FROM transactions WHERE id = NEW.id AND user_id <> NEW.user_id)
    BEGIN SELECT RAISE(ABORT, 'RECORD_ID_OWNED_BY_ANOTHER_USER'); END;

    CREATE TRIGGER IF NOT EXISTS account_flows_owner_guard
    BEFORE INSERT ON account_flows
    WHEN EXISTS (SELECT 1 FROM account_flows WHERE id = NEW.id AND user_id <> NEW.user_id)
    BEGIN SELECT RAISE(ABORT, 'RECORD_ID_OWNED_BY_ANOTHER_USER'); END;
  `);
}
