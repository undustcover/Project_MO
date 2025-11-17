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
  summary(
    @Query('projectId') projectId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('wellNumber') wellNumber?: string,
    @Query('taskName') taskName?: string
  ) {
    return this.service.summary(Number(projectId), from, to, wellNumber, taskName)
  }

  @Get('template')
  template(@Res() res: Response) {
    const header = [
      '井号',
      '年度',
      '任务名称',
      '工作结构分解',
      '计划开始时间',
      '计划完成时间',
      '实际开始时间',
      '实际完成时间',
      '实际工作量',
      '单位',
      '综合单价',
      '附加费用',
      '合计价值工作量',
      '收入计划',
      '确认收入时间',
      '已确认金额',
      '收现时间',
      '收现金额'
    ]
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
    const expect = [
      '井号',
      '年度',
      '任务名称',
      '工作结构分解',
      '计划开始时间',
      '计划完成时间',
      '实际开始时间',
      '实际完成时间',
      '实际工作量',
      '单位',
      '综合单价',
      '附加费用',
      '合计价值工作量',
      '收入计划',
      '确认收入时间',
      '已确认金额',
      '收现时间',
      '收现金额'
    ]
    const missing = expect.filter((h, i) => String(header[i] || '') !== h)
    if (missing.length) return { ok: false, error: `列校验失败，请按模板列顺序：${expect.join(',')}` }
    const out: any[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue
      const wellNo = String(r[0] || '').trim() || undefined
      const year = String(r[1] || '').trim() || undefined
      const taskName = String(r[2] || '').trim() || undefined
      const wbs = String(r[3] || '').trim() || undefined
      const plannedStart = normalizeExcelDate(r[4]) || undefined
      const plannedEnd = normalizeExcelDate(r[5]) || undefined
      const actualStart = normalizeExcelDate(r[6]) || undefined
      const actualEnd = normalizeExcelDate(r[7]) || undefined
      const actualWorkload = r[8] != null && r[8] !== '' ? Number(r[8]) : undefined
      const unit = String(r[9] || '').trim() || undefined
      const unitPriceUSD = r[10] != null && r[10] !== '' ? Number(r[10]) : undefined
      const additionalFeeUSD = r[11] != null && r[11] !== '' ? Number(r[11]) : undefined
      const totalWorkValueUSD = r[12] != null && r[12] !== '' ? Number(r[12]) : undefined
      const revenuePlanUSD = r[13] != null && r[13] !== '' ? Number(r[13]) : undefined
      const revenueConfirmedDate = normalizeExcelDate(r[14]) || undefined
      const revenueConfirmedAmountUSD = r[15] != null && r[15] !== '' ? Number(r[15]) : undefined
      const cashDate = normalizeExcelDate(r[16]) || undefined
      const cashAmountUSD = r[17] != null && r[17] !== '' ? Number(r[17]) : undefined
      const source = wellNo || ''
      const item = taskName || ''
      const amount = revenueConfirmedAmountUSD != null ? Number(revenueConfirmedAmountUSD) : 0
      const date = revenueConfirmedDate || ''
      const remark = undefined
      out.push({
        source,
        item,
        amount,
        date,
        remark,
        wellNo,
        year,
        taskName,
        wbs,
        plannedStart,
        plannedEnd,
        actualStart,
        actualEnd,
        actualWorkload,
        unit,
        unitPriceUSD,
        additionalFeeUSD,
        totalWorkValueUSD,
        revenuePlanUSD,
        revenueConfirmedDate,
        revenueConfirmedAmountUSD,
        cashDate,
        cashAmountUSD
      })
    }
    return this.service.import(Number(projectId), out)
  }

  @Delete('clear')
  async clear(@Query('projectId') projectId?: string) { return this.service.clear(projectId ? Number(projectId) : undefined) }
}