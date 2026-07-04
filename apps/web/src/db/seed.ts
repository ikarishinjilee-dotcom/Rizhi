import { rizhiDb } from "@/db/rizhiDb";
import {
  mockAccountFlows,
  mockAccounts,
  mockAssetAddons,
  mockAssetPartEvents,
  mockAssets,
  mockCategories,
  mockSettings,
  mockTransactions,
} from "@/data/mock";

const SEED_VERSION = "9";

async function writeSeedData() {
  await rizhiDb.transaction(
    "rw",
    [
      rizhiDb.assets,
      rizhiDb.assetAddons,
      rizhiDb.assetPartEvents,
      rizhiDb.accounts,
      rizhiDb.transactions,
      rizhiDb.accountFlows,
      rizhiDb.categories,
      rizhiDb.settings,
      rizhiDb.metadata,
    ],
    async () => {
      await Promise.all([
        rizhiDb.assets.clear(),
        rizhiDb.assetAddons.clear(),
        rizhiDb.assetPartEvents.clear(),
        rizhiDb.accounts.clear(),
        rizhiDb.transactions.clear(),
        rizhiDb.accountFlows.clear(),
        rizhiDb.categories.clear(),
        rizhiDb.settings.clear(),
      ]);

      await rizhiDb.categories.bulkPut(mockCategories);
      await rizhiDb.accounts.bulkPut(mockAccounts);
      await rizhiDb.assets.bulkPut(mockAssets);
      await rizhiDb.assetAddons.bulkPut(mockAssetAddons);
      await rizhiDb.assetPartEvents.bulkPut(mockAssetPartEvents);
      await rizhiDb.transactions.bulkPut(mockTransactions);
      await rizhiDb.accountFlows.bulkPut(mockAccountFlows);
      await rizhiDb.settings.put(mockSettings);
      await rizhiDb.metadata.put({ key: "seeded-version", value: SEED_VERSION });
    },
  );
}

export async function seedDatabaseIfNeeded() {
  const seeded = await rizhiDb.metadata.get("seeded-version");
  if (seeded?.value === SEED_VERSION) return;

  await writeSeedData();
}

export async function resetSeedDatabase() {
  await writeSeedData();
}
