import { expect, test } from "@playwright/test";

test.describe("public routes", () => {
  test("home page renders sign-in button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "ResearchGit" })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in with google/i })).toBeVisible();
  });

  test("/canvas-demo renders the sticky board", async ({ page }) => {
    await page.goto("/canvas-demo");
    await expect(
      page.getByText(/Sticky board|Co-design canvas|Add sticky note/i).first(),
    ).toBeVisible();
  });

  test("/deck redirects unauthenticated users to /", async ({ page }) => {
    const response = await page.goto("/deck");
    expect(response?.url()).toMatch(/\/$/);
  });

  test("/admin/regenerate redirects unauthenticated users", async ({ page }) => {
    const response = await page.goto("/admin/regenerate");
    expect(response?.url()).toMatch(/\/$/);
  });
});
