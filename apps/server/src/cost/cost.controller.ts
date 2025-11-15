import { Controller, Get, Query, Post, UploadedFile, UseInterceptors, Res, Delete } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import * as XLSX from 'xlsx'
import { Response } from 'express'
import * as multer from 'multer'
import { CostService } from './cost.service'

function excelDateToISO(val: number) {
  const d = new Date((val - 25569) * 86400 * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}
function normalizeExcelDate(v: any) {
  if (typeof v === 'number') return excelDateToISO(v)
  let s = String(v || '').trim()
  if (!s) return ''
  s = s.replace(/[.:/]/g, '-')
  const d = new Date(s)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

@Controller('dashboard/cost')
export class CostController {
  constructor(private readonly service: CostService) {}

  @Get('summary')
  summary(@Query('projectId') projectId: string, @Query('from') from?: string, @Query('to') to?: string, @Query('taskName') taskName?: string) {
    return this.service.summary(Number(projectId), from, to, taskName)
  }

  @Get('template')
  template(@Res() res: Response) {
    const header = ['任务名称', '成本要素组-1级名称', '成本要素组-2级名称', '成本要素组-3级名称', '成本计划细分项-4级名称', '单位', '单价', '数量', '总成本', '收入']
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([header])
    XLSX.utils.book_append_sheet(wb, ws, '模板')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="cost_template.xlsx"')
    res.send(buf)
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async import(@UploadedFile() file: Express.Multer.File, @Query('projectId') projectId: string) {
    if (!file || !file.buffer) return { ok: false, error: '未收到文件' }
    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    const header = rows[0] || []
    const expect = ['任务名称', '成本要素组-1级名称', '成本要素组-2级名称', '成本要素组-3级名称', '成本计划细分项-4级名称', '单位', '单价', '数量', '总成本', '收入']
    const missing = expect.filter((h, i) => String(header[i] || '') !== h)
    if (missing.length) return { ok: false, error: `列校验失败，请按模板列顺序：${expect.join(',')}` }
    const out: { projectName: string; taskName: string; groupLevel1: string; groupLevel2: string; groupLevel3: string; groupLevel4?: string; unit?: string; unitPrice?: number; quantity?: number; totalCost: number; revenue?: number }[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue
      const taskName = String(r[0] || '').trim()
      const l1 = String(r[1] || '').trim()
      const l2 = String(r[2] || '').trim()
      const l3 = String(r[3] || '').trim()
      const l4 = String(r[4] || '').trim() || undefined
      const unit = String(r[5] || '').trim() || undefined
      const unitPrice = r[6] != null ? Number(r[6]) : undefined
      const quantity = r[7] != null ? Number(r[7]) : undefined
      const totalCost = Number(r[8] || 0)
      const revenue = r[9] != null ? Number(r[9]) : undefined
      if (!taskName || !l1 || !l2 || !l3) continue
      out.push({ taskName, groupLevel1: l1, groupLevel2: l2, groupLevel3: l3, groupLevel4: l4, unit, unitPrice, quantity, totalCost, revenue })
    }
    return this.service.import(Number(projectId), out)
  }

  @Delete('clear')
  async clear(@Query('projectId') projectId?: string) { return this.service.clear(projectId ? Number(projectId) : undefined) }

  @Get('plan/template')
  planTemplate(@Res() res: Response) {
    const header = ['任务名称', '项目总预算', '任务总预算', '任务人员预算', '任务材料预算', '任务设备预算', '任务服务预算']
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([header])
    XLSX.utils.book_append_sheet(wb, ws, '模板')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="cost_plan_template.xlsx"')
    res.send(buf)
  }

  @Post('plan/import')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async importPlan(@UploadedFile() file: Express.Multer.File, @Query('projectId') projectId: string) {
    if (!file || !file.buffer) return { ok: false, error: '未收到文件' }
    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    const header = rows[0] || []
    const expect = ['任务名称', '项目总预算', '任务总预算', '任务人员预算', '任务材料预算', '任务设备预算', '任务服务预算']
    const missing = expect.filter((h, i) => String(header[i] || '') !== h)
    if (missing.length) return { ok: false, error: `列校验失败，请按模板列顺序：${expect.join(',')}` }
    const out: { projectName: string; taskName: string; projectBudget?: number; taskBudget?: number; budgetLabor?: number; budgetMaterials?: number; budgetEquipment?: number; budgetServices?: number }[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue
      const taskName = String(r[0] || '').trim()
      const projectBudget = r[1] != null ? Number(r[1]) : undefined
      const taskBudget = r[2] != null ? Number(r[2]) : undefined
      const budgetLabor = r[3] != null ? Number(r[3]) : undefined
      const budgetMaterials = r[4] != null ? Number(r[4]) : undefined
      const budgetEquipment = r[5] != null ? Number(r[5]) : undefined
      const budgetServices = r[6] != null ? Number(r[6]) : undefined
      if (!taskName) continue
      out.push({ taskName, projectBudget, taskBudget, budgetLabor, budgetMaterials, budgetEquipment, budgetServices })
    }
    return this.service.importPlan(Number(projectId), out)
  }

  @Get('sixRadar')
  sixRadar(@Query('projectId') projectId: string, @Query('taskName') taskName?: string) {
    return this.service.sixRadar(Number(projectId), taskName)
  }

  @Get('kpis')
  kpis(@Query('projectId') projectId: string, @Query('taskName') taskName?: string) {
    return this.service.kpis(Number(projectId), taskName)
  }

  @Get('tasks')
  tasks(@Query('projectId') projectId: string) { return this.service.tasks(Number(projectId)) }

  @Get('budget/template')
  budgetTemplate(@Res() res: Response) {
    const header = ['任务名称', '成本要素组-2级名称', '预算']
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([header])
    XLSX.utils.book_append_sheet(wb, ws, '模板')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="cost_budget_template.xlsx"')
    res.send(buf)
  }

  @Post('budget/import')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async importBudget(@UploadedFile() file: Express.Multer.File, @Query('projectId') projectId: string) {
    if (!file || !file.buffer) return { ok: false, error: '未收到文件' }
    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    const header = rows[0] || []
    const expect = ['任务名称', '成本要素组-2级名称', '预算']
    const missing = expect.filter((h, i) => String(header[i] || '') !== h)
    if (missing.length) return { ok: false, error: `列校验失败，请按模板列顺序：${expect.join(',')}` }
    const allow = ['项目直接成本-服务费', '项目直接成本-材料费', '项目直接成本-人工费', '项目直接成本-设备费']
    const out: { taskName: string; groupLevel2: string; budget: number }[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue
      const taskName = String(r[0] || '').trim()
      const l2 = String(r[1] || '').trim()
      const budget = Number(r[2] || 0)
      if (!taskName || !l2 || !allow.includes(l2)) continue
      out.push({ taskName, groupLevel2: l2, budget })
    }
    return this.service.importBudget(Number(projectId), out)
  }
}