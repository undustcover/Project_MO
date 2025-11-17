import { test, expect, request } from '@playwright/test'

test.describe('进度仪表盘 E2E 冒烟', () => {
  test('页面加载与核心模块可见', async ({ page }) => {
    const api = await request.newContext({ baseURL: 'http://localhost:3000/api' })
    await api.post('/projects', {
      data: {
        contractNo: 'E2E-CN-001',
        name: 'E2E项目',
        participants: [],
        subcontractors: []
      }
    })

    await page.goto('/progress')

    await expect(page.getByText('进度仪表盘')).toBeVisible()

    await expect(page.getByText('六维雷达图')).toBeVisible()
    await expect(page.getByText('评分明细')).toBeVisible()
    await expect(page.getByText('建井周期统计')).toBeVisible()
    await expect(page.getByText('工作时效对比')).toBeVisible()
    await expect(page.getByText('度量明细')).toBeVisible()
    await expect(page.getByText('计划与实际对比（完成时间差）')).toBeVisible()
    await expect(page.getByText('计划与实际列表')).toBeVisible()

    await page.getByRole('button', { name: '刷新' }).click()
    await expect(page.locator('.overall-label')).toBeVisible()
  })
})