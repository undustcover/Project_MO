import { Controller, Get, Query, Post, UploadedFile, UseInterceptors, Res, Delete } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import * as XLSX from 'xlsx'
import { Response } from 'express'
import * as multer from 'multer'
import { RevenueService } from './revenue.service'

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

@Controller('dashboard/revenue')
export class RevenueController {
  constructor(private readonly service: RevenueService) {}

  @Get('summary')
  summary(@Query('projectId') projectId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(Number(projectId), from, to)
  }

  @Get('template')
  template(@Res() res: Response) {
    const header = ['来源', '项目', '金额', '日期', '备注']
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([header])
    XLSX.utils.book_append_sheet(wb, ws, '模板')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="revenue_template.xlsx"')
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
    const expect = ['来源', '项目', '金额', '日期', '备注']
    const missing = expect.filter((h, i) => String(header[i] || '') !== h)
    if (missing.length) return { ok: false, error: `列校验失败，请按模板列顺序：${expect.join(',')}` }
    const out: { source: string; item: string; amount: number; date: string; remark?: string }[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue
      const source = String(r[0] || '').trim()
      const item = String(r[1] || '').trim()
      const amount = Number(r[2] || 0)
      const date = normalizeExcelDate(r[3])
      const remark = String(r[4] || '').trim() || undefined
      if (!source || !item || !date) continue
      out.push({ source, item, amount, date, remark })
    }
    return this.service.import(Number(projectId), out)
  }

  @Delete('clear')
  async clear(@Query('projectId') projectId?: string) { return this.service.clear(projectId ? Number(projectId) : undefined) }
}