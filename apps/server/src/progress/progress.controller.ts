import { Controller, Get, Query, Post, UploadedFile, UseInterceptors, Res, Delete } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ProgressService } from './progress.service'
import * as XLSX from 'xlsx'
import { Response } from 'express'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProgressEvent } from './entities/progress-event.entity'
import { Project } from '../projects/entities/project.entity'
import * as multer from 'multer'
import { ProgressPlan } from './entities/progress-plan.entity'
import { ContractMetric } from './entities/contract-metric.entity'

@Controller('dashboard/progress')
export class ProgressController {
  constructor(
    private readonly service: ProgressService,
    @InjectRepository(ProgressEvent) private repo: Repository<ProgressEvent>,
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(ProgressPlan) private planRepo: Repository<ProgressPlan>,
    @InjectRepository(ContractMetric) private contractRepo: Repository<ContractMetric>
  ) {}
  @Get()
  dashboard(
    @Query('projectId') projectId: string,
    @Query('taskName') taskName?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('wellNumber') wellNumber?: string
  ) {
    return this.service.dashboard(Number(projectId), taskName, from, to, wellNumber)
  }

  @Get('tasks')
  tasks(@Query('projectId') projectId: string, @Query('wellNumber') wellNumber?: string) {
    return this.service.tasks(Number(projectId), wellNumber)
  }

  @Get('taskDetail')
  taskDetail(
    @Query('projectId') projectId: string,
    @Query('taskName') taskName: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('wellNumber') wellNumber?: string
  ) {
    return this.service.taskDetail(Number(projectId), taskName, from, to, wellNumber)
  }

  @Get('taskBreakdown')
  taskBreakdown(
    @Query('projectId') projectId: string,
    @Query('taskName') taskName: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('wellNumber') wellNumber?: string
  ) {
    return this.service.taskBreakdown(Number(projectId), taskName, from, to, wellNumber)
  }

  @Get('wells')
  wells(@Query('projectId') projectId: string) {
    return this.service.wells(Number(projectId))
  }

  @Get('cycleDetail')
  cycleDetail(
    @Query('projectId') projectId: string,
    @Query('cycleType') cycleType: 'task' | 'moving' | 'drilling' | 'completion' | 'testing',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('wellNumber') wellNumber?: string
  ) {
    return this.service.cycleDetail(Number(projectId), cycleType || 'task', from, to, wellNumber)
  }

  @Get('cycleBreakdown')
  cycleBreakdown(
    @Query('projectId') projectId: string,
    @Query('cycleType') cycleType: 'task' | 'moving' | 'drilling' | 'completion' | 'testing',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('wellNumber') wellNumber?: string
  ) {
    return this.service.cycleBreakdown(Number(projectId), cycleType || 'task', from, to, wellNumber)
  }

  @Get('template')
  template(@Query('projectId') projectId: string, @Res() res: Response) {
    const header = ['井号', '工况名称', '工况一级时效', '工况二级时效', '工况三级时效', '开始时间', '结束时间', '负责人', '日期']
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([header])
    XLSX.utils.book_append_sheet(wb, ws, '模板')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="progress_template.xlsx"')
    res.send(buf)
  }

  @Delete('actual')
  async clearActual(@Query('projectId') projectId?: string) {
    if (projectId) {
      await this.repo.createQueryBuilder().delete().where('projectId = :pid', { pid: Number(projectId) }).execute()
    } else {
      await this.repo.createQueryBuilder().delete().execute()
    }
    return { ok: true }
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async import(@UploadedFile() file: Express.Multer.File, @Query('projectId') projectId: string) {
    const pid = Number(projectId)
    const project = await this.projects.findOne({ where: { id: pid } })
    if (!project) return { ok: false }
    if (!file || !file.buffer) return { ok: false, error: '未收到文件' }
    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    const header = rows[0] || []
    const expect = ['井号', '工况名称', '工况一级时效', '工况二级时效', '工况三级时效', '开始时间', '结束时间', '负责人', '日期']
    const missing = expect.filter((h, i) => String(header[i] || '') !== h)
    if (missing.length) return { ok: false, error: `列校验失败，请按模板列顺序：${expect.join(',')}` }
    const out: ProgressEvent[] = []
    const groupSum = new Map<string, number>()
    const groupKeys: string[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue
      const wellNumber = String(r[0] || '').trim()
      const conditionName = String(r[1] || '').trim()
      const level1 = String(r[2] || '').trim()
      const level2 = String(r[3] || '').trim()
      const level3 = String(r[4] || '').trim()
      const startTime = String(r[5] || '').trim()
      const endTime = String(r[6] || '').trim()
      let date = r[8]
      if (typeof date === 'number') {
        date = excelDateToISO(date)
      } else {
        date = normalizeExcelDate(date)
      }
      if (!conditionName || !startTime || !endTime) continue
      const hours = calcHours(startTime, endTime)
      const ev = this.repo.create({ project, wellNumber, conditionName, level1, level2, level3, hours, date })
      out.push(ev)
      if (date && wellNumber) {
        const key = `${String(project.id)}|${wellNumber}|${date}`
        if (!groupSum.has(key)) { groupSum.set(key, 0); groupKeys.push(key) }
        groupSum.set(key, (groupSum.get(key) || 0) + Number(hours || 0))
      }
    }
    const overflow = groupKeys.filter(k => (groupSum.get(k) || 0) > 24)
    if (overflow.length) {
      const tips = overflow.map(k => {
        const [pid, wn, d] = k.split('|'); return `${wn}-${d}(${groupSum.get(k)}h)`
      })
      return { ok: false, error: `每日总时效不得超过24小时，超出记录：${tips.join(', ')}` }
    }
    // 覆盖策略：对于同一项目同一井号同一日期，先删除旧数据，再保存新数据
    for (const k of groupKeys) {
      const [pid, wn, d] = k.split('|')
      await this.repo.createQueryBuilder().delete().where('projectId = :pid AND wellNumber = :wn AND date = :d', { pid: Number(pid), wn, d }).execute()
    }
    if (out.length) await this.repo.save(out)
    return { ok: true, count: out.length }
  }

  @Get('plan/template')
  planTemplate(@Res() res: Response) {
    const header = ['井号', '工况名称', '计划开始时间', '计划结束时间']
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([header])
    XLSX.utils.book_append_sheet(wb, ws, '模板')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="plan_template.xlsx"')
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
    const expect = ['井号', '工况名称', '计划开始时间', '计划结束时间']
    const missing = expect.filter((h, i) => String(header[i] || '') !== h)
    if (missing.length) return { ok: false, error: `列校验失败，请按模板列顺序：${expect.join(',')}` }
    const out: { wellNumber: string; conditionName: string; planStartDate: string; planEndDate: string }[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue
      const wellNumber = String(r[0] || '').trim()
      const conditionName = String(r[1] || '').trim()
      const planStartDate = normalizeExcelDate(r[2])
      const planEndDate = normalizeExcelDate(r[3])
      if (!wellNumber || !conditionName || !planStartDate || !planEndDate) continue
      out.push({ wellNumber, conditionName, planStartDate, planEndDate })
    }
    return this.service.importPlan(Number(projectId), out)
  }

  @Get('plan/compare')
  compare(@Query('projectId') projectId: string, @Query('wellNumber') wellNumber?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.planCompare(Number(projectId), wellNumber, from, to)
  }

  @Get('contract/template')
  async contractTemplate(@Res() res: Response) {
    const t = await this.service.contractTemplate()
    const header = t.header
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([header])
    XLSX.utils.book_append_sheet(wb, ws, '模板')
    const rules = XLSX.utils.aoa_to_sheet(t.rules)
    XLSX.utils.book_append_sheet(wb, rules, '填写规则')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    res.setHeader('Cache-Control', 'no-cache')
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.attachment('contract_template.xlsx')
    res.send(buf)
  }

  @Post('contract/import')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async importContract(@UploadedFile() file: Express.Multer.File, @Query('projectId') projectId: string) {
    if (!file || !file.buffer) return { ok: false, error: '未收到文件' }
    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    const header = rows[0] || []
    const expect = ['井号', '合同生产时间(小时)', '合同非生产时间(小时)', '合同中完时间(小时)', '合同搬家周期(小时)', '合同完井周期(小时)', '合同钻井周期(小时)']
    const missing = expect.filter((h, i) => String(header[i] || '') !== h)
    if (missing.length) return { ok: false, error: `列校验失败，请按模板列顺序：${expect.join(',')}` }
    const out: { wellNumber: string; productionTime: number; nonProductionTime: number; completionTime: number; movingPeriod: number; wellCompletionPeriod: number; drillingPeriod: number }[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue
      const wellNumber = String(r[0] || '').trim()
      const productionTime = Number(r[1] || 0)
      const nonProductionTime = Number(r[2] || 0)
      const completionTime = Number(r[3] || 0)
      const movingPeriod = Number(r[4] || 0)
      const wellCompletionPeriod = Number(r[5] || 0)
      const drillingPeriod = Number(r[6] || 0)
      if (!wellNumber) continue
      out.push({ wellNumber, productionTime, nonProductionTime, completionTime, movingPeriod, wellCompletionPeriod, drillingPeriod })
    }
    return this.service.importContract(Number(projectId), out)
  }

  @Get('contract')
  async getContract(@Query('projectId') projectId: string, @Query('wellNumber') wellNumber?: string) {
    return this.service.getContract(Number(projectId), wellNumber)
  }
}

function calcHours(startTime: string, endTime: string) {
  const sp = startTime.split(':').map(n => parseInt(n, 10))
  const ep = endTime.split(':').map(n => parseInt(n, 10))
  if (sp.length < 2 || ep.length < 2) return 0
  let sm = sp[0] * 60 + (sp[1] || 0)
  let em = ep[0] * 60 + (ep[1] || 0)
  let diff = em - sm
  if (diff < 0) diff += 24 * 60
  return diff / 60
}

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