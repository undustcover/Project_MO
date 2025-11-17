import { test, expect, request } from '@playwright/test'

test.describe('成本仪表盘 E2E 冒烟', () => {
  test('页面加载与核心模块可见', async ({ page }) => {
    const api = await request.newContext({ baseURL: 'http://localhost:3000/api' })
    await api.post('/projects', { data: { contractNo: 'E2E-COST-' + Date.now(), name: 'E2E 成本项目', participants: [], subcontractors: [] } })

    await page.goto('/cost')

    await expect(page.getByText('成本仪表盘')).toBeVisible()
    await expect(page.getByText('成本KPI看板')).toBeVisible()
    await expect(page.getByText('公式明细')).toBeVisible()
    await expect(page.getByText('成本六维雷达图')).toBeVisible()
    await expect(page.getByText('评分明细')).toBeVisible()
    await expect(page.getByText('度量明细')).toBeVisible()
    await expect(page.getByText('项目总体成本分类分布')).toBeVisible()
    await expect(page.getByText('成本列表（按井号汇总）')).toBeVisible()
  })
})