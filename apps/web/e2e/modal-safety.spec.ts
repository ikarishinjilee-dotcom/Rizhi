import { expect, test, type Locator, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const tinyPngPath = join(tmpdir(), "rizhi-e2e-image.png");

test.beforeAll(() => {
  writeFileSync(
    tinyPngPath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    ),
  );
});

test.beforeEach(async ({ page }) => {
  await page.goto("/assets");
  await expect(page.getByText("Rizhi")).toBeVisible();
});

test("asset and addon modals do not show stale unsaved prompts after save, and image confirmations stay clickable", async ({ page }) => {
  const assetName = `E2E Asset ${Date.now()}`;
  const editedAssetName = `${assetName} Edited`;

  await page.getByTestId("asset-create-button").click();
  await fillField(page.getByTestId("asset-name-field"), assetName);
  await fillField(page.getByTestId("asset-cost-field"), "123");
  await page.getByTestId("asset-upsert-save").click();

  await expect(page.getByTestId("asset-upsert-modal")).toBeHidden();
  await expect(page.getByText("放弃未保存的资产内容？")).toHaveCount(0);

  await page.getByTestId("asset-create-button").click();
  await page.getByTestId("asset-image-input").setInputFiles(tinyPngPath);
  await expect(page.getByTestId("asset-image-remove")).toBeVisible();

  await page.getByTestId("asset-image-remove").click();
  await expect(page.getByTestId("confirm-modal")).toBeVisible();
  await page.getByTestId("confirm-modal-cancel").click();
  await expect(page.getByTestId("asset-image-remove")).toBeVisible();

  await page.getByTestId("asset-image-remove").click();
  await page.getByTestId("confirm-modal-confirm").click();
  await expect(page.getByTestId("asset-image-remove")).toHaveCount(0);
  await page.getByTestId("asset-upsert-close").click();
  await expect(page.getByTestId("asset-upsert-modal")).toBeHidden();

  await page.getByText(assetName, { exact: true }).click();
  await expect(page).toHaveURL(/\/assets\//);
  await page.getByText("编辑", { exact: true }).click();
  await fillField(page.getByTestId("asset-name-field"), editedAssetName);
  await page.getByTestId("asset-upsert-save").click();

  await expect(page.getByTestId("asset-upsert-modal")).toBeHidden();
  await expect(page.getByText("放弃未保存的资产内容？")).toHaveCount(0);

  await page.getByTestId("asset-tab-addons").click();
  await page.getByTestId("asset-add-addon").click();
  await expect(page.getByTestId("asset-addon-modal")).toBeVisible();

  await fillField(page.getByTestId("addon-name-field"), "E2E 附加项");
  await fillField(page.getByTestId("addon-amount-field"), "18");
  await page.getByTestId("addon-image-input").setInputFiles(tinyPngPath);
  await expect(page.getByTestId("addon-image-remove")).toBeVisible();

  await page.getByTestId("addon-image-remove").click();
  await expect(page.getByTestId("confirm-modal")).toBeVisible();
  await expect(page.getByTestId("asset-addon-modal")).toBeVisible();
  await page.getByTestId("confirm-modal-cancel").click();
  await expect(page.getByTestId("asset-addon-modal")).toBeVisible();
  await fillField(page.getByTestId("addon-name-field"), "E2E 附加项 B");

  await page.getByTestId("addon-image-remove").click();
  await page.getByTestId("confirm-modal-confirm").click();
  await expect(page.getByTestId("addon-image-remove")).toHaveCount(0);

  await page.getByTestId("asset-addon-save").click();
  await expect(page.getByTestId("asset-addon-modal")).toBeHidden();
  await expect(page.getByText("放弃未保存的附加项内容？")).toHaveCount(0);
});

test("asset deletion always asks for confirmation before removing data", async ({ page }) => {
  const assetName = `E2E Delete Guard ${Date.now()}`;

  await createAsset(page, assetName, "66");
  await expect(page.getByText(assetName, { exact: true })).toBeVisible();

  const card = page.getByTestId("asset-card").filter({ hasText: assetName });
  await card.getByTestId("asset-card-menu").hover();
  await card.getByTestId("asset-card-delete").click();

  await expect(page.getByTestId("confirm-modal")).toBeVisible();
  await page.getByTestId("confirm-modal-cancel").click();
  await expect(page.getByTestId("confirm-modal")).toBeHidden();
  await expect(page.getByText(assetName, { exact: true })).toBeVisible();

  await card.getByTestId("asset-card-menu").hover();
  await card.getByTestId("asset-card-delete").click();
  await expect(page.getByTestId("confirm-modal")).toBeVisible();
  await page.getByTestId("confirm-modal-confirm").click();
  await expect(page.getByTestId("confirm-modal")).toBeHidden();
  await expect(page.getByText(assetName, { exact: true })).toHaveCount(0);
});

test("ledger transaction deletion always asks for confirmation before removing the row", async ({ page }) => {
  await page.goto("/ledger");
  await expect(page.getByText("Rizhi")).toBeVisible();

  const row = page.getByTestId("ledger-row").filter({ hasText: "地铁" }).first();
  const deleteButton = row.getByTestId("ledger-delete-transaction");

  await expect(row).toBeVisible();
  await expect(deleteButton).toBeEnabled();

  await deleteButton.click();
  await expect(page.getByTestId("confirm-modal")).toBeVisible();
  await page.getByTestId("confirm-modal-cancel").click();
  await expect(page.getByTestId("confirm-modal")).toBeHidden();
  await expect(row).toBeVisible();

  await deleteButton.click();
  await expect(page.getByTestId("confirm-modal")).toBeVisible();
  await page.getByTestId("confirm-modal-confirm").click();
  await expect(page.getByTestId("confirm-modal")).toBeHidden();
  await expect(row).toHaveCount(0);
});

test("fund account deletion asks for confirmation and blocks accounts with flows", async ({ page }) => {
  await page.goto("/funds");
  await expect(page.getByText("Rizhi")).toBeVisible();

  const accountName = "支付宝余额";
  const accountLine = page.getByTestId("fund-account-line").filter({ hasText: accountName }).first();

  await expect(accountLine).toBeVisible();
  await accountLine.click();
  await expect(page.getByTestId("fund-account-detail")).toBeVisible();
  await expect(page.getByTestId("fund-account-detail")).toContainText(accountName);

  await page.getByTestId("fund-account-delete").click();
  await expect(page.getByTestId("confirm-modal")).toBeVisible();
  await page.getByTestId("confirm-modal-cancel").click();
  await expect(page.getByTestId("confirm-modal")).toBeHidden();
  await expect(page.getByTestId("fund-account-detail")).toContainText(accountName);

  await page.getByTestId("fund-account-delete").click();
  await expect(page.getByTestId("confirm-modal")).toBeVisible();
  await page.getByTestId("confirm-modal-confirm").click();
  await expect(page.getByTestId("fund-account-delete-error")).toBeVisible();
  await expect(page.getByTestId("fund-account-delete-error")).toContainText("资金流水");
  await expect(page.getByTestId("confirm-modal")).toBeVisible();
  await expect(page.getByTestId("fund-account-detail")).toContainText(accountName);
});

test("category deletion is blocked when transactions still use the category", async ({ page }) => {
  await page.goto("/settings/categories");
  await expect(page.getByText("Rizhi")).toBeVisible();

  await page.getByTestId("category-domain-transaction").click();
  const categoryCard = page.locator('[data-testid="category-parent-card"][data-category-id="tx-transport"]');

  await expect(categoryCard).toBeVisible();
  await categoryCard.getByTestId("category-parent-delete").click();

  await expect(page.getByTestId("confirm-modal")).toBeVisible();
  await expect(page.getByTestId("confirm-modal-confirm")).toHaveCount(0);
  await page.getByTestId("confirm-modal-cancel").click();
  await expect(page.getByTestId("confirm-modal")).toBeHidden();
  await expect(categoryCard).toBeVisible();
});

async function createAsset(page: Page, name: string, cost: string) {
  await page.getByTestId("asset-create-button").click();
  await fillField(page.getByTestId("asset-name-field"), name);
  await fillField(page.getByTestId("asset-cost-field"), cost);
  await page.getByTestId("asset-upsert-save").click();
  await expect(page.getByTestId("asset-upsert-modal")).toBeHidden();
}

async function fillField(field: Locator, value: string) {
  await field.locator("input").fill(value);
}
