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
      '项目名称',
      '项目昵称',
      '合同编号',
      '合同金额（万美元）',
      '合同开始日期',
      '合同结束日期',
      '业主单位',
      '井队动态',
      '施工情况',
      '联系人1',
      '联系人2',
      '下轮市场计划',
      '备注说明'
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([header])
    XLSX.utils.book_append_sheet(wb, ws, '模板')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    res.setHeader('Cache-Control', 'no-cache')
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.attachment('tracking_template.xlsx')
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
      '项目名称',
      '项目昵称',
      '合同编号',
      '合同金额（万美元）',
      '合同开始日期',
      '合同结束日期',
      '业主单位',
      '井队动态',
      '施工情况',
      '联系人1',
      '联系人2',
      '下轮市场计划',
      '备注说明'
    ]
    const missing = expect.filter((h, i) => String(header[i] || '') !== h)
    if (missing.length) return { ok: false, error: `列校验失败，请按模板列顺序：${expect.join(',')}` }
    const out: any[] = []
    const details: Array<{ row: number; colIndex: number; colName: string; cell: string; reason: string }> = []
    const toCol = (idx: number) => {
      const n = idx + 1
      let s = ''
      let x = n
      while (x > 0) { const r = (x - 1) % 26; s = String.fromCharCode(65 + r) + s; x = Math.floor((x - 1) / 26) }
      return s
    }
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue
      const marketCountry = String(r[0] || '').trim() || undefined
      const idxNoRaw = r[1]
      const indexNo = idxNoRaw != null && idxNoRaw !== '' ? Number(idxNoRaw) : undefined
      if (idxNoRaw != null && idxNoRaw !== '' && isNaN(Number(idxNoRaw))) details.push({ row: i + 1, colIndex: 1, colName: '序号', cell: `${toCol(1)}${i + 1}`, reason: '数字格式错误' })
      const teamNo = String(r[2] || '').trim() || undefined
      const teamNewNo = String(r[3] || '').trim() || undefined
      const rigNo = String(r[4] || '').trim() || undefined
      const rigModel = String(r[5] || '').trim() || undefined
      const manufacturer = String(r[6] || '').trim() || undefined
      const pdRaw = r[7]
      const productionDate = normalizeExcelDate(pdRaw) || undefined
      if (pdRaw != null && pdRaw !== '' && !productionDate) details.push({ row: i + 1, colIndex: 7, colName: '投产日期', cell: `${toCol(7)}${i + 1}`, reason: '日期格式错误' })
      const executor = String(r[8] || '').trim() || undefined
      const projectName = String(r[9] || '').trim() || undefined
      const projectNickname = String(r[10] || '').trim() || undefined
      const contractNo = String(r[11] || '').trim() || undefined
      const amtRaw = r[12]
      const contractAmountUSD = amtRaw != null && amtRaw !== '' ? Number(amtRaw) : undefined
      if (amtRaw != null && amtRaw !== '' && isNaN(Number(amtRaw))) details.push({ row: i + 1, colIndex: 12, colName: '合同金额（万美元）', cell: `${toCol(12)}${i + 1}`, reason: '金额格式错误' })
      const csRaw = r[13]
      const ceRaw = r[14]
      const contractStartDate = normalizeExcelDate(csRaw) || undefined
      const contractEndDate = normalizeExcelDate(ceRaw) || undefined
      if (csRaw != null && csRaw !== '' && !contractStartDate) details.push({ row: i + 1, colIndex: 13, colName: '合同开始日期', cell: `${toCol(13)}${i + 1}`, reason: '日期格式错误' })
      if (ceRaw != null && ceRaw !== '' && !contractEndDate) details.push({ row: i + 1, colIndex: 14, colName: '合同结束日期', cell: `${toCol(14)}${i + 1}`, reason: '日期格式错误' })
      const ownerUnit = String(r[15] || '').trim() || undefined
      const teamStatus = String(r[16] || '').trim() || undefined
      const allowed = ['待令', '组停', '动搬迁', '钻井', '完井', '试油气']
      if (teamStatus && !allowed.includes(teamStatus)) details.push({ row: i + 1, colIndex: 16, colName: '井队动态', cell: `${toCol(16)}${i + 1}`, reason: `取值必须为：${allowed.join('、')}` })
      const constructionStatus = String(r[17] || '').trim() || undefined
      const c1Raw = String(r[18] || '').trim() || undefined
      const c2Raw = String(r[19] || '').trim() || undefined
      const contactPattern = /^\s*[^:：]+\s*[:：]\s*\+?\d[\d\-\s]{5,}$/
      if (c1Raw && !contactPattern.test(c1Raw)) details.push({ row: i + 1, colIndex: 18, colName: '联系人1', cell: `${toCol(18)}${i + 1}`, reason: '格式应为 姓名：电话' })
      if (c2Raw && !contactPattern.test(c2Raw)) details.push({ row: i + 1, colIndex: 19, colName: '联系人2', cell: `${toCol(19)}${i + 1}`, reason: '格式应为 姓名：电话' })
      const nextMarketPlan = String(r[20] || '').trim() || undefined
      const remark = String(r[21] || '').trim() || undefined
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
        projectName,
        projectNickname,
        contractNo,
        contractAmountUSD,
        contractStartDate,
        contractEndDate,
        ownerUnit,
        teamStatus,
        constructionStatus,
        contact1: c1Raw,
        contact2: c2Raw,
        nextMarketPlan,
        remark
      })
    }
    if (details.length) return { ok: false, error: '数据校验失败', details }
    return this.service.import(Number(projectId), out)
  }

  @Delete('clear')
  async clear(@Query('projectId') projectId?: string) { return this.service.clear(projectId ? Number(projectId) : undefined) }

  @Post('focus/set')
  async setFocus(
    @Query('projectId') projectId: string,
    @Query('contractNo') contractNo?: string,
    @Query('projectName') projectName?: string
  ) {
    return this.service.setFocus(Number(projectId), contractNo, projectName)
  }

  @Get('focus/list')
  async listFocus(@Query('projectId') projectId: string) { return this.service.listFocus(Number(projectId)) }

  @Get('focus/template')
  focusTemplate(@Res() res: Response) {
    const header = [
      '项目名称',
      '工作量（口）',
      '项目实时进度',
      '预计开钻时间',
      '首井开钻时间',
      '重点关注事项',
      '已完成价值工作量',
      '今年预计完成工作量'
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([header])
    XLSX.utils.book_append_sheet(wb, ws, '模板')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    res.setHeader('Cache-Control', 'no-cache')
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.attachment('focus_template.xlsx')
    res.send(buf)
  }

  @Post('focus/import')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async importFocus(@UploadedFile() file: Express.Multer.File, @Query('projectId') projectId: string) {
    if (!file || !file.buffer) return { ok: false, error: '未收到文件' }
    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    const header = rows[0] || []
    const expect = [
      '项目名称',
      '工作量（口）',
      '项目实时进度',
      '预计开钻时间',
      '首井开钻时间',
      '重点关注事项',
      '已完成价值工作量',
      '今年预计完成工作量'
    ]
    const invalid = expect.filter((h, i) => String(header[i] || '') !== h)
    if (invalid.length) return { ok: false, error: `列校验失败，请按模板列顺序：${expect.join(',')}` }
    const items: any[] = []
    const details: Array<{ row: number; colIndex: number; colName: string; cell: string; reason: string }> = []
    const toCol = (idx: number) => { const n = idx + 1; let s = ''; let x = n; while (x > 0) { const r = (x - 1) % 26; s = String.fromCharCode(65 + r) + s; x = Math.floor((x - 1) / 26) } return s }
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0) continue
      const pnRaw = String(r[0] || '').trim()
      const wlRaw = r[1]
      const estRaw = r[3]
      const dtRaw = r[4]
      if (!pnRaw) details.push({ row: i + 1, colIndex: 0, colName: '项目名称', cell: `${toCol(0)}${i + 1}`, reason: '项目名称不能为空' })
      if (wlRaw != null && wlRaw !== '' && isNaN(Number(wlRaw))) details.push({ row: i + 1, colIndex: 1, colName: '工作量（口）', cell: `${toCol(1)}${i + 1}`, reason: '数字格式错误' })
      const normEst = (() => { let s = String(estRaw || '').trim(); if (!s) return undefined; s = s.replace(/[.:/]/g, '-'); const d = new Date(s); if (isNaN(d.getTime())) return undefined; const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const da = String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}` })()
      if (estRaw != null && estRaw !== '' && !normEst) details.push({ row: i + 1, colIndex: 3, colName: '预计开钻时间', cell: `${toCol(3)}${i + 1}`, reason: '日期格式错误(YYYY:MM:DD)' })
      const normDT = (() => {
        let s = String(dtRaw || '').trim()
        if (!s) return undefined
        s = s.replace(/[:]/g, '-').replace(/^(.{10})-/, '$1 ')
        const d = new Date(s)
        if (isNaN(d.getTime())) return undefined
        const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const da = String(d.getDate()).padStart(2, '0'); const hh = String(d.getHours()).padStart(2, '0'); const mm = String(d.getMinutes()).padStart(2, '0')
        return `${y}-${m}-${da} ${hh}:${mm}`
      })()
      if (dtRaw != null && dtRaw !== '' && !normDT) details.push({ row: i + 1, colIndex: 4, colName: '首井开钻时间', cell: `${toCol(4)}${i + 1}`, reason: '日期时间格式错误(YYYY:MM:DD:hh:mm)' })
      items.push({
        projectName: pnRaw,
        workloadCount: wlRaw != null && wlRaw !== '' ? Number(wlRaw) : undefined,
        realtimeProgress: String(r[2] || '').trim(),
        estimatedSpudDate: normEst,
        firstWellSpudTime: normDT,
        focusItems: String(r[5] || '').trim(),
        workValueDone: String(r[6] || '').trim(),
        expectedWorkThisYear: String(r[7] || '').trim()
      })
    }
    if (details.length) return { ok: false, error: '数据校验失败', details }
    return this.service.importFocus(Number(projectId), items)
  }

  @Delete('focus')
  async deleteFocus(
    @Query('projectId') projectId: string,
    @Query('contractNo') contractNo?: string,
    @Query('projectName') projectName?: string
  ) {
    return this.service.removeFocus(Number(projectId), contractNo, projectName)
  }
}