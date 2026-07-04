import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("filters, sorts, disables, and restores asset categories consistently", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/settings/categories");
  const toolbar = page.locator(".asset-category-toolbar");
  const digitalItem = page.getByTestId("category-item-asset-digital");
  const digitalToggle = page.getByTestId("asset-category-toggle-asset-digital");
  await expect(toolbar).toBeVisible();

  await page.getByTestId("asset-category-status-disabled").click();
  if (await digitalToggle.count()) await digitalToggle.click();
  await page.getByTestId("asset-category-status-active").click();
  await expect(digitalItem).toBeVisible();

  await toolbar.locator("input").fill("digital");
  await expect(digitalItem).toHaveCount(0);
  await toolbar.locator("input").fill("");
  await toolbar.getByRole("button", { name: /usage|使用量|浣跨敤閲/ }).click();
  await expect(toolbar.getByRole("button", { name: /usage|使用量|浣跨敤閲/ })).toHaveClass(/active/);

  await page.goto("/assets");
  await page.getByTestId("asset-create-button").click();
  await expect(page.getByTestId("asset-category-option-asset-digital")).toBeVisible();
  await page.getByTestId("asset-upsert-cancel").click();

  await page.goto("/settings/categories");
  await page.getByTestId("asset-category-status-active").click();
  await expect(digitalToggle).toBeVisible();
  await digitalToggle.click();
  await expect(digitalItem).toHaveCount(0);

  await page.goto("/assets");
  await page.getByTestId("asset-create-button").click();
  await expect(page.getByTestId("asset-category-option-asset-digital")).toHaveCount(0);
  await page.getByTestId("asset-upsert-cancel").click();

  await page.goto("/settings/categories");
  await page.getByTestId("asset-category-status-disabled").click();
  await expect(digitalItem).toBeVisible();
  await digitalToggle.click();
  await page.getByTestId("asset-category-status-active").click();
  await expect(digitalItem).toBeVisible();

  await page.screenshot({ path: join(tmpdir(), "rizhi-asset-category-filter.png"), fullPage: false });
  expect(consoleErrors).toEqual([]);
});
