import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { TrackingRecord } from './entities/tracking-record.entity'
import { FocusProject } from './entities/focus-project.entity'
import { Project } from '../projects/entities/project.entity'

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(TrackingRecord) private repo: Repository<TrackingRecord>,
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(FocusProject) private focusRepo: Repository<FocusProject>
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

  async setFocus(projectId: number, contractNo: string) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const exists = await this.repo.findOne({ where: { project: { id: projectId } as any, contractNo } as any })
    if (!exists) return { ok: false, error: `合同编号未录入：${contractNo}` }
    const dup = await this.focusRepo.findOne({ where: { project: { id: projectId } as any, contractNo } as any })
    if (dup) return { ok: true }
    await this.focusRepo.save(this.focusRepo.create({ project, contractNo }))
    return { ok: true }
  }

  async listFocus(projectId: number) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { rows: [] }
    const focus = await this.focusRepo.find({ where: { project: { id: projectId } as any } })
    const byContract = new Map<string, TrackingRecord | undefined>()
    const recs = await this.repo.find({ where: { project: { id: projectId } as any } })
    for (const r of recs) { const k = String(r.contractNo || ''); if (k) byContract.set(k, r) }
    const rows = focus.map(f => {
      const r = byContract.get(f.contractNo)
      return {
        contractNo: f.contractNo,
        region: r?.marketCountry || '',
        executor: r?.executor || '',
        rigNo: r?.teamNo || '',
        projectTerm: r?.contractStartDate && r?.contractEndDate ? `${r.contractStartDate} ~ ${r.contractEndDate}` : '',
        projectName: f.projectName || '',
        workloadCount: f.workloadCount ?? null,
        realtimeProgress: f.realtimeProgress || '',
        firstWellSpudTime: f.firstWellSpudTime || '',
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
    const contractSet = new Set((await this.repo.find({ where: { project: { id: projectId } as any } })).map(r => String(r.contractNo || '')))
    const missing: string[] = []
    const normalizeDt = (v: any) => {
      let s = String(v || '').trim()
      if (!s) return undefined
      s = s.replace(/[:]/g, '-').replace(/^(.{10})-/, '$1 ')
      const d = new Date(s)
      if (isNaN(d.getTime())) return undefined
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const da = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${da} ${hh}:${mm}`
    }
    const cleaned: FocusProject[] = []
    for (const it of items) {
      const cn = String(it.contractNo || '').trim()
      if (!cn || !contractSet.has(cn)) { missing.push(cn || '(空合同编号)'); continue }
      const fp = this.focusRepo.create({
        project,
        contractNo: cn,
        projectName: String(it.projectName || '').trim() || undefined,
        workloadCount: it.workloadCount != null && it.workloadCount !== '' ? Number(it.workloadCount) : undefined,
        realtimeProgress: String(it.realtimeProgress || '').trim() || undefined,
        firstWellSpudTime: normalizeDt(it.firstWellSpudTime) || undefined,
        focusItems: String(it.focusItems || '').trim() || undefined,
        workValueDone: String(it.workValueDone || '').trim() || undefined,
        expectedWorkThisYear: String(it.expectedWorkThisYear || '').trim() || undefined
      })
      cleaned.push(fp)
    }
    if (missing.length) return { ok: false, error: `合同编号未录入：${missing.join(', ')}` }
    if (cleaned.length) {
      const cns = cleaned.map(c => c.contractNo)
      await this.focusRepo.createQueryBuilder().delete().where('projectId = :pid AND contractNo IN (:...cns)', { pid: projectId, cns }).execute()
      await this.focusRepo.save(cleaned)
    }
    return { ok: true, count: cleaned.length }
  }
}