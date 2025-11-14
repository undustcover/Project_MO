import { Controller, Get, Query, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ProgressService } from './progress.service'
import * as XLSX from 'xlsx'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProgressEvent } from './entities/progress-event.entity'
import { Project } from '../projects/entities/project.entity'
import * as multer from 'multer'

@Controller('dashboard/progress')
export class ProgressController {
  constructor(private readonly service: ProgressService, @InjectRepository(ProgressEvent) private repo: Repository<ProgressEvent>, @InjectRepository(Project) private projects: Repository<Project>) {}
  @Get()
  dashboard(@Query('projectId') projectId: string, @Query('taskName') taskName?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.dashboard(Number(projectId), taskName, from, to)
  }

  @Get('tasks')
  tasks(@Query('projectId') projectId: string) {
    return this.service.tasks(Number(projectId))
  }

  @Get('taskDetail')
  taskDetail(@Query('projectId') projectId: string, @Query('taskName') taskName: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.taskDetail(Number(projectId), taskName, from, to)
  }

  @Get('taskBreakdown')
  taskBreakdown(@Query('projectId') projectId: string, @Query('taskName') taskName: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.taskBreakdown(Number(projectId), taskName, from, to)
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
        date = String(date || '').trim()
      }
      if (!conditionName || !startTime || !endTime) continue
      const hours = calcHours(startTime, endTime)
      const ev = this.repo.create({ project, wellNumber, conditionName, level1, level2, level3, hours, date })
      out.push(ev)
    }
    if (out.length) await this.repo.save(out)
    return { ok: true, count: out.length }
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