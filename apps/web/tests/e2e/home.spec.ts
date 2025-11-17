import { test, expect } from '@playwright/test'

test('主页看板加载并显示模块', async ({ page }) => {
  await page.goto('/home')
  await expect(page.locator('.card-header')).toContainText('主页看板')
  await expect(page.locator('text=立项模块')).toBeVisible()
  await expect(page.locator('text=六维雷达图')).toBeVisible()
  await expect(page.locator('text=成本六维雷达图')).toBeVisible()
  await expect(page.locator('text=收入六维雷达图')).toBeVisible()
  await expect(page.locator('text=严重程度分布')).toBeVisible()
})