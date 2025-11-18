import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { TrackingRecord } from './entities/tracking-record.entity'
import { FocusProject } from './entities/focus-project.entity'
import { FocusWellSpud } from './entities/focus-well-spud.entity'
import { Project } from '../projects/entities/project.entity'

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(TrackingRecord) private repo: Repository<TrackingRecord>,
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(FocusProject) private focusRepo: Repository<FocusProject>,
    @InjectRepository(FocusWellSpud) private focusWellRepo: Repository<FocusWellSpud>
  ) {}

  async import(projectId: number, items: Array<Partial<TrackingRecord>>) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const filtered = items.filter(i => i.rigNo || i.teamNo || i.contractNo)
    // 覆盖策略：按项目整体覆盖（简化实现）
    await this.repo.createQueryBuilder().delete().where('projectId = :pid', { pid: projectId }).execute()
    const out = filtered.map(i => this.repo.create({ project, ...i }))
    if (out.length) await this.repo.save(out)
    return { ok: true, count: out.length }
  }

  async clear(projectId?: number) {
    if (projectId) await this.repo.createQueryBuilder().delete().where('projectId = :pid', { pid: projectId }).execute()
    else await this.repo.createQueryBuilder().delete().execute()
    return { ok: true }
  }

  async table(projectId: number) {
    const rows = await this.repo.find({ where: { project: { id: projectId } as any } })
    return { rows }
  }

  async summary(projectId: number) {
    const rows = await this.repo.find({ where: { project: { id: projectId } as any } })
    const statusKeys = ['待令', '组停', '动搬迁', '钻井', '完井', '试油气']
    const byStatus = new Map<string, number>()
    for (const s of statusKeys) byStatus.set(s, 0)
    for (const r of rows) {
      const s = String(r.teamStatus || '')
      if (!s) continue
      byStatus.set(s, (byStatus.get(s) || 0) + 1)
    }
    const unused = (byStatus.get('待令') || 0) + (byStatus.get('组停') || 0)
    const used = statusKeys.filter(s => s !== '待令' && s !== '组停').reduce((sum, s) => sum + (byStatus.get(s) || 0), 0)

    const statusCounts = statusKeys.map(s => ({ status: s, count: byStatus.get(s) || 0 }))

    const group = (arr: Array<any>, pick: (r: any) => string) => {
      const m = new Map<string, number>()
      for (const r of arr) {
        const k = String(pick(r) || '').trim()
        if (!k) continue
        m.set(k, (m.get(k) || 0) + 1)
      }
      return Array.from(m.entries()).map(([name, count]) => ({ name, count }))
    }

    const executorDistribution = group(rows, r => r.executor)
    const rigModelDistribution = group(rows, r => r.rigModel)
    const ownerDistribution = group(rows, r => r.ownerUnit)

    const contractMap = new Map<string, number>()
    for (const r of rows) {
      const k = String(r.contractNo || '').trim()
      if (!k) continue
      contractMap.set(k, (contractMap.get(k) || 0) + 1)
    }
    const contractCategories = Array.from(contractMap.keys())
    const contractValues = contractCategories.map(c => contractMap.get(c) || 0)

    const now = new Date()
    const yearsBetween = (d?: string) => {
      if (!d) return undefined
      const dt = new Date(d)
      const diff = now.getTime() - dt.getTime()
      return diff / (365 * 24 * 3600 * 1000)
    }
    let lt5 = 0, btw5to10 = 0, gt10 = 0
    for (const r of rows) {
      const y = yearsBetween(r.productionDate)
      if (y == null) continue
      if (y < 5) lt5++
      else if (y <= 10) btw5to10++
      else gt10++
    }
    const ageDistribution = [
      { range: '五年以内', count: lt5 },
      { range: '5-10年', count: btw5to10 },
      { range: '10年以上', count: gt10 }
    ]

    const daysUntil = (d?: string) => {
      if (!d) return undefined
      const dt = new Date(d)
      const diffDays = Math.round((dt.getTime() - now.getTime()) / (24 * 3600 * 1000))
      return diffDays
    }
    const expiringContracts = rows
      .map(r => ({
        contractNo: r.contractNo,
        rigNo: r.rigNo,
        teamNo: r.teamNo,
        contractEndDate: r.contractEndDate,
        daysRemaining: daysUntil(r.contractEndDate)
      }))
      .filter(it => it.daysRemaining != null && it.daysRemaining >= 0 && it.daysRemaining < 45)

    return {
      statusUsage: {
        usedCount: used,
        unusedCount: unused,
        statusCounts
      },
      executorDistribution,
      rigModelDistribution,
      ownerDistribution,
      contractShare: { categories: contractCategories, values: contractValues },
      ageDistribution,
      expiringContracts
    }
  }

  async setFocus(projectId: number, contractNo?: string, projectName?: string) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    let record: TrackingRecord | null = null
    if (projectName) {
      record = await this.repo.findOne({ where: { project: { id: projectId } as any, projectName } as any })
      if (!record) return { ok: false, error: `项目名称未录入：${projectName}` }
      const dup2 = await this.focusRepo.findOne({ where: { project: { id: projectId } as any, projectName } as any })
      if (dup2) return { ok: true }
      await this.focusRepo.save(this.focusRepo.create({ project, projectName, contractNo: record.contractNo }))
    } else if (contractNo) {
      record = await this.repo.findOne({ where: { project: { id: projectId } as any, contractNo } as any })
      if (!record) return { ok: false, error: `合同编号未录入：${contractNo}` }
      const dup = await this.focusRepo.findOne({ where: { project: { id: projectId } as any, contractNo } as any })
      if (dup) return { ok: true }
      await this.focusRepo.save(this.focusRepo.create({ project, contractNo, projectName: record.projectName }))
    } else {
      return { ok: false, error: '缺少参数：需提供合同编号或项目名称' }
    }
    return { ok: true }
  }

  async removeFocus(projectId: number, contractNo?: string, projectName?: string) {
    if (contractNo) {
      await this.focusRepo.createQueryBuilder().delete().where('projectId = :pid AND contractNo = :cn', { pid: projectId, cn: contractNo }).execute()
      return { ok: true }
    }
    if (projectName) {
      await this.focusRepo.createQueryBuilder().delete().where('projectId = :pid AND projectName = :pn', { pid: projectId, pn: projectName }).execute()
      return { ok: true }
    }
    return { ok: false, error: '缺少参数：需提供合同编号或项目名称' }
  }

  async listFocus(projectId: number) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { rows: [] }
    const focus = await this.focusRepo.find({ where: { project: { id: projectId } as any } })
    const byContract = new Map<string, TrackingRecord | undefined>()
    const byProjectName = new Map<string, TrackingRecord | undefined>()
    const recs = await this.repo.find({ where: { project: { id: projectId } as any } })
    for (const r of recs) {
      const kc = String(r.contractNo || '')
      const kp = String(r.projectName || '')
      if (kc) byContract.set(kc, r)
      if (kp) byProjectName.set(kp, r)
    }
    const wells = await this.focusWellRepo.find({ where: { project: { id: projectId } as any } })
    const wellsByPN = new Map<string, Array<{ wellNo: string; estimatedSpudDate?: string; firstWellSpudTime?: string }>>()
    for (const w of wells) {
      const key = String(w.projectName || '')
      if (!key) continue
      const arr = wellsByPN.get(key) || []
      arr.push({ wellNo: w.wellNo, estimatedSpudDate: w.estimatedSpudDate, firstWellSpudTime: w.firstWellSpudTime })
      wellsByPN.set(key, arr)
    }
    const rows = focus.map(f => {
      const r = f.contractNo ? byContract.get(f.contractNo) : (f.projectName ? byProjectName.get(f.projectName) : undefined)
      return {
        contractNo: (f.contractNo || r?.contractNo || ''),
        projectName: f.projectName || r?.projectName || '',
        region: r?.marketCountry || '',
        executor: r?.executor || '',
        rigNo: r?.teamNo || '',
        projectTerm: r?.contractStartDate && r?.contractEndDate ? `${r.contractStartDate} ~ ${r.contractEndDate}` : '',
        contractAmountUSD: r?.contractAmountUSD ?? undefined,
        contractStartDate: r?.contractStartDate ?? undefined,
        contractEndDate: r?.contractEndDate ?? undefined,
        ownerUnit: r?.ownerUnit ?? undefined,
        workloadCount: f.workloadCount ?? null,
        realtimeProgress: f.realtimeProgress || '',
        estimatedSpudDate: f.estimatedSpudDate || '',
        firstWellSpudTime: f.firstWellSpudTime || '',
        wells: wellsByPN.get(String(f.projectName || '')) || [],
        focusItems: f.focusItems || '',
        workValueDone: f.workValueDone || '',
        expectedWorkThisYear: f.expectedWorkThisYear || ''
      }
    })
    return { rows }
  }

  async importFocus(projectId: number, items: Array<any>) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const recs = await this.repo.find({ where: { project: { id: projectId } as any } })
    const projectNameSet = new Set(recs.map(r => String(r.projectName || '').trim()).filter(Boolean))
    const missingNames: string[] = []
    const normalizeDt = (v: any) => {
      if (typeof v === 'number') {
        const d = new Date((v - 25569) * 86400 * 1000)
        const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const da = String(d.getDate()).padStart(2, '0'); const hh = String(d.getHours()).padStart(2, '0'); const mm = String(d.getMinutes()).padStart(2, '0'); const ss = String(d.getSeconds()).padStart(2, '0')
        return `${y}-${m}-${da} ${hh}:${mm}:${ss}`
      }
      let s = String(v || '').trim()
      if (!s) return undefined
      const m = s.match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})\s+(\d{2})[:\-](\d{2})(?::(\d{2}))?$/)
      if (!m) return undefined
      const [_, yy, MM, DD, hh, mm, ss] = m
      return `${yy}-${MM}-${DD} ${hh}:${mm}:${ss || '00'}`
    }
    const normalizeDate = (v: any) => {
      if (v == null || v === '') return undefined
      if (typeof v === 'number') {
        const d = new Date((v - 25569) * 86400 * 1000)
        const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const da = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${da}`
      }
      let s = String(v).trim()
      if (!s) return undefined
      if (/^\d+$/.test(s)) {
        const num = Number(s)
        const d = new Date((num - 25569) * 86400 * 1000)
        const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const da = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${da}`
      }
      s = s.replace(/[.:/]/g, '-')
      const d = new Date(s)
      if (isNaN(d.getTime())) return undefined
      const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const da = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${da}`
    }
    const cleaned: FocusProject[] = []
    for (const it of items) {
      const pn = String(it.projectName || '').trim()
      if (!pn || !projectNameSet.has(pn)) { missingNames.push(pn || '(空项目名称)'); continue }
      const fp = this.focusRepo.create({
        project,
        projectName: pn || undefined,
        workloadCount: it.workloadCount != null && it.workloadCount !== '' ? Number(it.workloadCount) : undefined,
        realtimeProgress: String(it.realtimeProgress || '').trim() || undefined,
        firstWellSpudTime: normalizeDt(it.firstWellSpudTime) || undefined,
        estimatedSpudDate: normalizeDate(it.estimatedSpudDate) || undefined,
        focusItems: String(it.focusItems || '').trim() || undefined,
        workValueDone: String(it.workValueDone || '').trim() || undefined,
        expectedWorkThisYear: String(it.expectedWorkThisYear || '').trim() || undefined
      })
      cleaned.push(fp)
    }
    if (missingNames.length) return { ok: false, error: `项目名称未录入：${missingNames.join(', ')}` }
    if (cleaned.length) {
      const pns = cleaned.map(c => c.projectName).filter(Boolean) as string[]
      if (pns.length) await this.focusRepo.createQueryBuilder().delete().where('projectId = :pid AND projectName IN (:...pns)', { pid: projectId, pns }).execute()
      await this.focusRepo.save(cleaned)
    }
    return { ok: true, count: cleaned.length }
  }

  async importFocusWells(projectId: number, items: Array<{ projectName: string; wellNo: string; firstWellSpudTime?: string }>) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const focus = await this.focusRepo.find({ where: { project: { id: projectId } as any } })
    const focusPN = new Set(focus.map(f => String(f.projectName || '').trim()).filter(Boolean))
    const invalid: string[] = []
    const cleaned: FocusWellSpud[] = []
    const findFocus = (pn: string) => focus.find(f => String(f.projectName || '') === pn)
    for (const it of items) {
      const pn = String(it.projectName || '').trim()
      const wn = String(it.wellNo || '').trim()
      if (!pn || !wn) { invalid.push(`${pn || '(空项目名称)'}-${wn || '(空井号)'}`); continue }
      if (!focusPN.has(pn)) { invalid.push(`${pn}`); continue }
      const entity = this.focusWellRepo.create({ project, focus: findFocus(pn), projectName: pn, wellNo: wn, firstWellSpudTime: it.firstWellSpudTime })
      cleaned.push(entity)
    }
    if (invalid.length) return { ok: false, error: `项目名称或井号不一致：${invalid.join(', ')}` }
    await this.focusWellRepo.createQueryBuilder().delete().where('projectId = :pid', { pid: projectId }).execute()
    if (cleaned.length) await this.focusWellRepo.save(cleaned)

    const toMs = (s?: string | null) => {
      if (!s) return NaN
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
      if (!m) return NaN
      const yy = Number(m[1]), MM = Number(m[2]) - 1, DD = Number(m[3])
      const hh = Number(m[4] || '0'), mm = Number(m[5] || '0'), ss = Number(m[6] || '0')
      return Date.UTC(yy, MM, DD, hh, mm, ss)
    }
    const earliestByPN = new Map<string, string | null>()
    for (const c of cleaned) {
      if (!c.firstWellSpudTime) continue
      const key = c.projectName
      const prev = earliestByPN.get(key)
      if (!prev) { earliestByPN.set(key, c.firstWellSpudTime) }
      else {
        const a = toMs(c.firstWellSpudTime)
        const b = toMs(prev)
        if (!isNaN(a) && !isNaN(b) && a < b) earliestByPN.set(key, c.firstWellSpudTime)
      }
    }
    for (const fItem of focus) {
      const pn = String(fItem.projectName || '')
      if (!pn) continue
      const earliest = earliestByPN.get(pn) || null
      await this.focusRepo.createQueryBuilder().update(FocusProject).set({ firstWellSpudTime: earliest as any }).where('projectId = :pid AND projectName = :pn', { pid: projectId, pn }).execute()
    }
    return { ok: true, count: cleaned.length }
  }
}