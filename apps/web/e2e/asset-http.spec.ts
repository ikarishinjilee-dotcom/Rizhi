import { expect, test, type Locator } from "@playwright/test";

test.skip(process.env.RIZHI_E2E_FASTIFY !== "1", "Fastify HTTP integration test");

test("creates an asset through the Fastify HTTP backend", async ({ page }) => {
  const assetName = `HTTP Asset ${Date.now()}`;
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/assets");
  await expect(page.getByText("Rizhi")).toBeVisible();
  await page.getByTestId("asset-create-button").click();
  await fillField(page.getByTestId("asset-name-field"), assetName);
  await fillField(page.getByTestId("asset-cost-field"), "123");
  const createResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/assets") && response.request().method() === "POST");
  await page.getByTestId("asset-upsert-save").click();
  const createResponse = await createResponsePromise;

  expect(createResponse.ok(), await createResponse.text()).toBe(true);
  await expect(page.getByTestId("asset-upsert-modal")).toBeHidden();
  const snapshot = await page.evaluate(async () => {
    const response = await fetch("http://127.0.0.1:18977/api/v1/snapshot", { cache: "no-store" });
    return response.json() as Promise<{ data: { assets: Array<{ name: string }> } }>;
  });
  expect(snapshot.data.assets.map((asset) => asset.name)).toContain(assetName);
  await expect(page.getByText(assetName, { exact: true })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

async function fillField(locator: Locator, value: string) {
  await locator.locator("input").fill(value);
}
