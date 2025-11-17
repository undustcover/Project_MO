import { test, expect } from '@playwright/test'

test.describe('项目立项 E2E 冒烟', () => {
  test('新建项目并跳转目标页', async ({ page }) => {
    await page.goto('/projects/new')

    await expect(page.getByRole('main').getByText('新建项目')).toBeVisible()

    await page.getByLabel('项目名称').fill('E2E 立项项目')
    await page.getByLabel('合同编号').fill('E2E-PROJ-' + Date.now())

    await page.getByLabel('合同周期').click()
    // 选择两个日期：由于日期组件为弹窗，使用输入直接填充值
    const inputs = page.locator('.el-date-editor .el-range-input')
    await inputs.nth(0).fill('2025-01-01')
    await inputs.nth(1).fill('2025-12-31')


    await page.getByRole('button', { name: '提交' }).click()

    await expect(page).toHaveURL(/\/projects\/\d+\/goals/)
    await expect(page.getByText('项目目标设定')).toBeVisible()
  })
})