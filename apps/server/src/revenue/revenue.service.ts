import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RevenueEvent } from './entities/revenue-event.entity'
import { Project } from '../projects/entities/project.entity'
import { ProgressPlan } from '../progress/entities/progress-plan.entity'
import { CostEvent } from '../cost/entities/cost-event.entity'
import { ProgressEvent } from '../progress/entities/progress-event.entity'

@Injectable()
export class RevenueService {
  constructor(
    @InjectRepository(RevenueEvent) private repo: Repository<RevenueEvent>,
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(ProgressPlan) private plans: Repository<ProgressPlan>,
    @InjectRepository(ProgressEvent) private progressEvents: Repository<ProgressEvent>,
    @InjectRepository(CostEvent) private costsRepo: Repository<CostEvent>
  ) {}

  async summary(projectId: number, from?: string, to?: string, wellNumber?: string, taskName?: string) {
    const qb = this.repo.createQueryBuilder('e').leftJoin('e.project', 'p').where('p.id = :id', { id: projectId })
    if (from) qb.andWhere('e.date >= :from', { from })
    if (to) qb.andWhere('e.date <= :to', { to })
    if (wellNumber) qb.andWhere('e.wellNo = :well', { well: wellNumber })
    if (taskName) qb.andWhere('e.taskName = :task', { task: taskName })
    const rows = await qb.getMany()
    const costs = await this.costsRepo.find({ where: { project: { id: projectId } as any } })
    const costByTask = new Map<string, number>()
    const costByPair = new Map<string, number>()
    let aggregatedCost = 0
    for (const c of costs) {
      const tn = String(c.taskName || '')
      const wn = String(c.wellNumber || '')
      costByTask.set(tn, (costByTask.get(tn) || 0) + Number(c.totalCost || 0))
      const key = `${wn}||${tn}`
      costByPair.set(key, (costByPair.get(key) || 0) + Number(c.totalCost || 0))
      if (!wellNumber && !taskName) aggregatedCost += Number(c.totalCost || 0)
    }
    if (wellNumber && taskName) {
      aggregatedCost = costs.filter(c => String(c.wellNumber || '') === String(wellNumber) && String(c.taskName || '') === String(taskName)).reduce((s, c) => s + Number(c.totalCost || 0), 0)
    } else if (wellNumber && !taskName) {
      aggregatedCost = costs.filter(c => String(c.wellNumber || '') === String(wellNumber)).reduce((s, c) => s + Number(c.totalCost || 0), 0)
    }
    const costTotals = rows.map(r => {
      const tn = String(r.taskName || r.item || '')
      const wn = String(r.wellNo || '')
      const byPair = costByPair.get(`${wn}||${tn}`)
      if (byPair != null) return byPair
      return costByTask.get(tn) || 0
    })
    const total = rows.reduce((s, r) => s + Number(r.amount), 0)
    const bySrc = new Map<string, number>()
    for (const r of rows) bySrc.set(r.source, (bySrc.get(r.source) || 0) + Number(r.amount))
    const categories = Array.from(bySrc.keys())
    const values = categories.map(c => bySrc.get(c) || 0)
    return { total, chart: { categories, values }, rows: rows.map((r, i) => ({ ...r, costTotal: costTotals[i] })), aggregatedCost }
  }

  async import(projectId: number, items: Array<any>) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const filtered = items.filter(i => i.source && i.item)
    const invalid: string[] = []
    for (const it of filtered) {
      const wn = String(it.wellNo || '')
      const tn = String(it.taskName || it.item || '')
      if (!tn) { invalid.push(`(缺少任务名称)`); continue }
      const planExists = await this.plans.findOne({ where: { project: { id: projectId } as any, wellNumber: wn, taskName: tn } })
      const eventExists = await this.progressEvents.findOne({ where: { project: { id: projectId } as any, wellNumber: wn, taskName: tn } as any })
      if (!planExists && !eventExists) invalid.push(`${wn || '无井号'}-${tn}`)
    }
    if (invalid.length) return { ok: false, error: `任务名称不一致：${invalid.join(', ')}` }
    const wells = Array.from(new Set(filtered.map(i => String(i.wellNo || '')).filter(w => !!w)))
    if (wells.length) {
      await this.repo.createQueryBuilder().delete().where('projectId = :pid AND wellNo IN (:...wells)', { pid: projectId, wells }).execute()
    }
    const out = filtered.map(i => this.repo.create({ project, ...i }))
    if (out.length) await this.repo.save(out)
    return { ok: true, count: out.length }
  }

  async clear(projectId?: number) {
    if (projectId) await this.repo.createQueryBuilder().delete().where('projectId = :pid', { pid: projectId }).execute()
    else await this.repo.createQueryBuilder().delete().execute()
    return { ok: true }
  }
}