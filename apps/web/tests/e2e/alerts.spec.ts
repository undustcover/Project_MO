import { test, expect, request } from '@playwright/test'

test.describe('预警中心 E2E 冒烟', () => {
  test('页面加载与新增规则', async ({ page }) => {
    const api = await request.newContext({ baseURL: 'http://localhost:3000/api' })
    await api.post('/projects', { data: { contractNo: 'E2E-ALERT-' + Date.now(), name: 'E2E 预警项目', participants: [], subcontractors: [] } })

    await page.goto('/alerts')
    await expect(page.getByText('预警中心')).toBeVisible()
    await expect(page.getByText('规则列表')).toBeVisible()
    await expect(page.getByText('预警记录')).toBeVisible()
    await expect(page.getByText('历史记录')).toBeVisible()

    await page.getByRole('button', { name: '新增规则' }).click()
    await expect(page.getByRole('dialog', { name: '新增规则' })).toBeVisible()
    await page.getByLabel('名称').fill('成本超支规则')
    await page.getByLabel('条件').fill('costVariance>10')
    // 默认级别为 medium，无需选择
    await page.getByRole('button', { name: '保存' }).click()

    await expect(page.getByText('规则列表')).toBeVisible()
  })
})