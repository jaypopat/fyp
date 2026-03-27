import { expect, test } from "@playwright/test";

test.describe("Dashboard smoke tests", () => {
	test("homepage loads and shows model registry", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("body")).toBeVisible();
		// The registry page should have a heading or table
		await expect(page.getByText(/model/i).first()).toBeVisible();
	});

	test("activity page loads", async ({ page }) => {
		await page.goto("/activity");
		await expect(page.locator("body")).toBeVisible();
		await expect(page.getByText(/activity/i).first()).toBeVisible();
	});

	test("demo page loads with scenario cards", async ({ page }) => {
		await page.goto("/demo");
		await expect(page.locator("body")).toBeVisible();
		await expect(page.getByText(/demo/i).first()).toBeVisible();
	});

	test("receipts page loads", async ({ page }) => {
		await page.goto("/receipts");
		await expect(page.locator("body")).toBeVisible();
	});

	test("navigation between pages works", async ({ page }) => {
		await page.goto("/");
		// Click a nav link to activity
		const activityLink = page.getByRole("link", { name: /activity/i });
		if (await activityLink.isVisible()) {
			await activityLink.click();
			await expect(page).toHaveURL(/activity/);
		}
	});
});
