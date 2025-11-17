import { Controller, Get, Query, Post, UploadedFile, UseInterceptors, Res, Delete } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import * as XLSX from 'xlsx'
import { Response } from 'express'
import * as multer from 'multer'
import { TrackingService } from './tracking.service'

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

@Controller('dashboard/tracking')
export class TrackingController {
  constructor(private readonly service: TrackingService) {}

  @Get('summary')
  summary(@Query('projectId') projectId: string) {
    return this.service.summary(Number(projectId))
  }

  @Get('table')
  table(@Query('projectId') projectId: string) { return this.service.table(Number(projectId)) }

  @Get('template')
  template(@Res() res: Response) {
    const header = [
      '市场国别',
      '序号',
      '队伍编号（国工编号）',
      '队伍新编号（中技服针编号）',
      '钻机编号（集团公司编号）',
      '钻机型号',
      '生产厂家',
      '投产日期',
      '执行主体',
      '合同编号',
      '合同金额（万美元）',
      '合同开始日期',
      '合同结束日期',
      '业主单位',
      '井队动态',
      '施工情况',
      '下轮市场计划',
      '备注说明'
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([header])
    XLSX.utils.book_append_sheet(wb, ws, '模板')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="tracking_template.xlsx"')
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
      '市场国别',
      '序号',
      '队伍编号（国工编号）',
      '队伍新编号（中技服针编号）',
      '钻机编号（集团公司编号）',
      '钻机型号',
      '生产厂家',
      '投产日期',
      '执行主体',
      '合同编号',
      '合同金额（万美元）',
      '合同开始日期',
      '合同结束日期',
      '业主单位',
      '井队动态',
      '施工情况',
      '下轮市场计划',
      '备注说明'
    ]
    const missing = expect.filter((h, i) => String(header[i] || '') !== h)
    if (missing.length) return { ok: false, error: `列校验失败，请按模板列顺序：${expect.join(',')}` }
    const out: any[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue
      const marketCountry = String(r[0] || '').trim() || undefined
      const indexNo = r[1] != null && r[1] !== '' ? Number(r[1]) : undefined
      const teamNo = String(r[2] || '').trim() || undefined
      const teamNewNo = String(r[3] || '').trim() || undefined
      const rigNo = String(r[4] || '').trim() || undefined
      const rigModel = String(r[5] || '').trim() || undefined
      const manufacturer = String(r[6] || '').trim() || undefined
      const productionDate = normalizeExcelDate(r[7]) || undefined
      const executor = String(r[8] || '').trim() || undefined
      const contractNo = String(r[9] || '').trim() || undefined
      const contractAmountUSD = r[10] != null && r[10] !== '' ? Number(r[10]) : undefined
      const contractStartDate = normalizeExcelDate(r[11]) || undefined
      const contractEndDate = normalizeExcelDate(r[12]) || undefined
      const ownerUnit = String(r[13] || '').trim() || undefined
      const teamStatus = String(r[14] || '').trim() || undefined
      const constructionStatus = String(r[15] || '').trim() || undefined
      const nextMarketPlan = String(r[16] || '').trim() || undefined
      const remark = String(r[17] || '').trim() || undefined
      out.push({
        marketCountry,
        indexNo,
        teamNo,
        teamNewNo,
        rigNo,
        rigModel,
        manufacturer,
        productionDate,
        executor,
        contractNo,
        contractAmountUSD,
        contractStartDate,
        contractEndDate,
        ownerUnit,
        teamStatus,
        constructionStatus,
        nextMarketPlan,
        remark
      })
    }
    return this.service.import(Number(projectId), out)
  }

  @Delete('clear')
  async clear(@Query('projectId') projectId?: string) { return this.service.clear(projectId ? Number(projectId) : undefined) }
}