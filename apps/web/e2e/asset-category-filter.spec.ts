import { expect, test } from "@playwright/test";

test("category management keeps search, status filters, and parent highlight consistent", async ({ page }) => {
  await page.goto("/settings/categories");
  const toolbar = page.locator(".category-manager-grid__toolbar");
  await expect(toolbar).toBeVisible();

  const digitalItem = page.getByTestId("category-item-asset-digital");
  await expect(digitalItem).toBeVisible();

  await toolbar.locator("input").fill("不存在的分类");
  await expect(digitalItem).toHaveCount(0);
  await toolbar.locator("input").fill("");

  const allButton = toolbar.getByRole("button", { name: "全部", exact: true });
  const activeButton = toolbar.getByRole("button", { name: "启用", exact: true });
  await expect(activeButton).toHaveClass(/active/);
  await allButton.click();
  await expect(allButton).toHaveClass(/active/);

  const parentMain = digitalItem.locator(".category-card__main");
  await parentMain.click();
  await expect(digitalItem).toHaveClass(/active/);
});
