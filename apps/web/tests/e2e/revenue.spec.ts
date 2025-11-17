import { test, expect, request } from '@playwright/test'

test.describe('收入仪表盘 E2E 冒烟', () => {
  test('页面加载与核心模块可见', async ({ page }) => {
    const api = await request.newContext({ baseURL: 'http://localhost:3000/api' })
    await api.post('/projects', { data: { contractNo: 'E2E-REV-' + Date.now(), name: 'E2E 收入项目', participants: [], subcontractors: [] } })

    await page.goto('/revenue')

    await expect(page.getByText('收入仪表盘')).toBeVisible()
    await expect(page.getByText('项目总览')).toBeVisible()
    await expect(page.getByText('六维雷达图')).toBeVisible()
    await expect(page.getByText('评分明细')).toBeVisible()
    await expect(page.getByText('度量明细')).toBeVisible()
    await expect(page.getByText('收入来源分布')).toBeVisible()
    await expect(page.getByText('价值工作量圆盘')).toBeVisible()
    await expect(page.getByText('进度图')).toBeVisible()
    await expect(page.getByText('收入列表')).toBeVisible()
  })
})