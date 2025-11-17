import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProgressEvent } from './entities/progress-event.entity'
import { ProgressPlan } from './entities/progress-plan.entity'
import { Project } from '../projects/entities/project.entity'
import { ContractMetric } from './entities/contract-metric.entity'

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(ProgressEvent) private repo: Repository<ProgressEvent>,
    @InjectRepository(ProgressPlan) private plans: Repository<ProgressPlan>,
    @InjectRepository(Project) private projectsRepo: Repository<Project>,
    @InjectRepository(ContractMetric) private contractsRepo: Repository<ContractMetric>
  ) {}

  async dashboard(projectId: number, taskName?: string, from?: string, to?: string, wellNumber?: string) {
    const qb = this.repo.createQueryBuilder('e').leftJoin('e.project', 'p').where('p.id = :id', { id: projectId })
    if (taskName) qb.andWhere('e.conditionName = :task', { task: taskName })
    if (from) qb.andWhere('e.date >= :from', { from })
    if (to) qb.andWhere('e.date <= :to', { to })
    if (wellNumber) qb.andWhere('e.wellNumber = :wn', { wn: wellNumber })
    const rows = await qb.getMany()
    let movingCycleTime = 0
    let drillingCycleTime = 0
    let completionCycleTime = 0
    let testingCycleTime = 0
    let drillingProductionTime = 0
    let drillingNonProductionTime = 0
    let actualCompletionTime = 0
    let pureDrillingTime = 0
    let trippingTime = 0
    let footageWorkingTime = 0
    for (const r of rows) {
      const name = r.conditionName || ''
      if (name.includes('搬安')) movingCycleTime += Number(r.hours)
      else if (name.includes('完井')) completionCycleTime += Number(r.hours)
      else if (name.includes('试油') || name.includes('测试') || name.includes('试气')) testingCycleTime += Number(r.hours)
      else drillingCycleTime += Number(r.hours)
      if (r.level1 === '生产时效') drillingProductionTime += Number(r.hours)
      if (r.level1 === '非生产时效') drillingNonProductionTime += Number(r.hours)
      if (r.level2 && (r.level2.includes('固井') || r.level2.includes('电测'))) actualCompletionTime += Number(r.hours)
      if (r.level3 && (r.level3.includes('纯钻'))) pureDrillingTime += Number(r.hours)
      if ((r.level2 && r.level2.includes('进尺')) && (r.level3 && r.level3.includes('起下钻'))) trippingTime += Number(r.hours)
      if (r.level2 && (r.level2.includes('进尺'))) footageWorkingTime += Number(r.hours)
    }
    const wellBuildingCycleTime = rows.reduce((sum, r) => sum + Number(r.hours || 0), 0)
    return {
      movingCycleTime,
      drillingCycleTime,
      completionCycleTime,
      testingCycleTime,
      drillingProductionTime,
      drillingNonProductionTime,
      actualCompletionTime,
      pureDrillingTime,
      trippingTime,
      footageWorkingTime,
      wellBuildingCycleTime
    }
  }

  async tasks(projectId: number, wellNumber?: string) {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoin('e.project', 'p')
      .where('p.id = :id', { id: projectId })
    if (wellNumber) qb.andWhere('e.wellNumber = :wn', { wn: wellNumber })
    const rows = await qb.select('DISTINCT e.conditionName', 'name').getRawMany()
    return rows.map(r => r.name).filter(Boolean)
  }

  async taskDetail(projectId: number, taskName: string, from?: string, to?: string, wellNumber?: string) {
    const qb = this.repo.createQueryBuilder('e').leftJoin('e.project', 'p').where('p.id = :id', { id: projectId }).andWhere('e.conditionName = :task', { task: taskName })
    if (from) qb.andWhere('e.date >= :from', { from })
    if (to) qb.andWhere('e.date <= :to', { to })
    if (wellNumber) qb.andWhere('e.wellNumber = :wn', { wn: wellNumber })
    const rows = await qb.getMany()
    let totalProduction = 0
    let totalNonProduction = 0
    let movingCycleTime = 0
    let drillingCycleTime = 0
    let completionCycleTime = 0
    let testingCycleTime = 0
    for (const r of rows) {
      if (r.level1 === '生产时效') totalProduction += Number(r.hours)
      if (r.level1 === '非生产时效') totalNonProduction += Number(r.hours)
      const name = r.conditionName || ''
      if (name.includes('搬安')) movingCycleTime += Number(r.hours)
      else if (name.includes('完井')) completionCycleTime += Number(r.hours)
      else if (name.includes('试油') || name.includes('测试') || name.includes('试气')) testingCycleTime += Number(r.hours)
      else drillingCycleTime += Number(r.hours)
    }
    const breakdown = rows.map(r => ({ wellNumber: r.wellNumber, level1: r.level1, level2: r.level2, level3: r.level3, hours: Number(r.hours) }))
    return { totalProduction, totalNonProduction, movingCycleTime, drillingCycleTime, completionCycleTime, testingCycleTime, breakdown }
  }

  async taskBreakdown(projectId: number, taskName: string, from?: string, to?: string, wellNumber?: string) {
    const qb = this.repo.createQueryBuilder('e').leftJoin('e.project', 'p').where('p.id = :id', { id: projectId }).andWhere('e.conditionName = :task', { task: taskName })
    if (from) qb.andWhere('e.date >= :from', { from })
    if (to) qb.andWhere('e.date <= :to', { to })
    if (wellNumber) qb.andWhere('e.wellNumber = :wn', { wn: wellNumber })
    const rows = await qb.getMany()
    const aggBy = (key: 'level2' | 'level3') => {
      const mapProd = new Map<string, number>()
      const mapNon = new Map<string, number>()
      for (const r of rows) {
        const k = (r[key] || '未分类') as string
        const h = Number(r.hours)
        if (r.level1 === '生产时效') mapProd.set(k, (mapProd.get(k) || 0) + h)
        else if (r.level1 === '非生产时效') mapNon.set(k, (mapNon.get(k) || 0) + h)
      }
      const cats = Array.from(new Set([...mapProd.keys(), ...mapNon.keys()]))
      const prod = cats.map(c => mapProd.get(c) || 0)
      const non = cats.map(c => mapNon.get(c) || 0)
      return { categories: cats, production: prod, nonProduction: non }
    }
    return { byLevel2: aggBy('level2'), byLevel3: aggBy('level3') }
  }

  async wells(projectId: number) {
    const rows = await this.repo
      .createQueryBuilder('e')
      .leftJoin('e.project', 'p')
      .where('p.id = :id', { id: projectId })
      .select('DISTINCT e.wellNumber', 'wellNumber')
      .getRawMany()
    return rows.map(r => r.wellNumber).filter(Boolean)
  }

  async importPlan(projectId: number, rows: Array<{ wellNumber: string; taskName?: string; conditionName: string; planStartDate: string; planEndDate: string }>) {
    const project = await this.projectsRepo.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const out = rows
      .filter(r => r.wellNumber && r.conditionName && r.planStartDate && r.planEndDate)
      .map(r => this.plans.create({ project, ...r }))
    if (!out.length) return { ok: false, error: '无有效数据' }
    const wellSet = Array.from(new Set(out.map(n => n.wellNumber)))
    for (const wn of wellSet) {
      await this.plans.createQueryBuilder().delete().where('projectId = :pid AND wellNumber = :wn', { pid: projectId, wn }).execute()
    }
    await this.plans.save(out)
    return { ok: true, count: out.length }
  }

  async planCompare(projectId: number, wellNumber?: string, from?: string, to?: string) {
    const plans = await this.plans.find({ where: wellNumber ? { project: { id: projectId }, wellNumber } as any : { project: { id: projectId } as any } })
    const out: any[] = []
    for (const p of plans) {
      const qb = this.repo
        .createQueryBuilder('e')
        .leftJoin('e.project', 'proj')
        .where('proj.id = :id', { id: projectId })
        .andWhere('e.wellNumber = :wn', { wn: p.wellNumber })
        .andWhere('e.conditionName = :cn', { cn: p.conditionName })
      if (from) qb.andWhere('e.date >= :from', { from })
      if (to) qb.andWhere('e.date <= :to', { to })
      const evs = await qb.getMany()
      const dates = evs.map(e => e.date).filter(Boolean)
      const toDate = (s: string) => new Date(s)
      const actualStart = dates.length ? dates.reduce((a, b) => (toDate(a) < toDate(b) ? a : b)) : null
      const actualEnd = dates.length ? dates.reduce((a, b) => (toDate(a) > toDate(b) ? a : b)) : null
      const planStart = p.planStartDate
      const planEnd = p.planEndDate
      const days = (a?: string | null, b?: string | null) => {
        if (!a || !b) return null
        const diff = toDate(a).getTime() - toDate(b).getTime()
        return Math.round(diff / 86400000)
      }
      out.push({
        wellNumber: p.wellNumber,
        conditionName: p.conditionName,
        planStartDate: planStart,
        planEndDate: planEnd,
        actualStartDate: actualStart,
        actualEndDate: actualEnd,
        completionDeltaDays: days(actualEnd, planEnd),
        planDurationDays: days(planEnd, planStart),
        actualDurationDays: days(actualEnd, actualStart)
      })
    }
    const categories = out.map(r => r.conditionName)
    const planValues = out.map(r => (typeof r.planDurationDays === 'number' ? r.planDurationDays : 0))
    const actualValues = out.map(r => (typeof r.actualDurationDays === 'number' ? r.actualDurationDays : 0))
    return { rows: out, chart: { categories, planValues, actualValues } }
  }

  async cycleDetail(projectId: number, cycleType: 'task' | 'moving' | 'drilling' | 'completion' | 'testing', from?: string, to?: string, wellNumber?: string) {
    const qb = this.repo.createQueryBuilder('e').leftJoin('e.project', 'p').where('p.id = :id', { id: projectId })
    if (from) qb.andWhere('e.date >= :from', { from })
    if (to) qb.andWhere('e.date <= :to', { to })
    if (wellNumber) qb.andWhere('e.wellNumber = :wn', { wn: wellNumber })
    let rows = await qb.getMany()
    const match = (r: ProgressEvent) => {
      const name = r.conditionName || ''
      if (cycleType === 'moving') return name.includes('搬安')
      if (cycleType === 'completion') return name.includes('完井')
      if (cycleType === 'testing') return name.includes('试油') || name.includes('测试') || name.includes('试气')
      if (cycleType === 'drilling') return !name.includes('搬安') && !name.includes('完井') && !(name.includes('试油') || name.includes('测试') || name.includes('试气'))
      return true
    }
    rows = rows.filter(match)
    let totalProduction = 0
    let totalNonProduction = 0
    let movingCycleTime = 0
    let drillingCycleTime = 0
    let completionCycleTime = 0
    let testingCycleTime = 0
    for (const r of rows) {
      if (r.level1 === '生产时效') totalProduction += Number(r.hours)
      if (r.level1 === '非生产时效') totalNonProduction += Number(r.hours)
      const name = r.conditionName || ''
      if (name.includes('搬安')) movingCycleTime += Number(r.hours)
      else if (name.includes('完井')) completionCycleTime += Number(r.hours)
      else if (name.includes('试油') || name.includes('测试') || name.includes('试气')) testingCycleTime += Number(r.hours)
      else drillingCycleTime += Number(r.hours)
    }
    const breakdown = rows.map(r => ({ wellNumber: r.wellNumber, level1: r.level1, level2: r.level2, level3: r.level3, hours: Number(r.hours) }))
    return { totalProduction, totalNonProduction, movingCycleTime, drillingCycleTime, completionCycleTime, testingCycleTime, breakdown }
  }

  async cycleBreakdown(projectId: number, cycleType: 'task' | 'moving' | 'drilling' | 'completion' | 'testing', from?: string, to?: string, wellNumber?: string) {
    const qb = this.repo.createQueryBuilder('e').leftJoin('e.project', 'p').where('p.id = :id', { id: projectId })
    if (from) qb.andWhere('e.date >= :from', { from })
    if (to) qb.andWhere('e.date <= :to', { to })
    if (wellNumber) qb.andWhere('e.wellNumber = :wn', { wn: wellNumber })
    let rows = await qb.getMany()
    const match = (r: ProgressEvent) => {
      const name = r.conditionName || ''
      if (cycleType === 'moving') return name.includes('搬安')
      if (cycleType === 'completion') return name.includes('完井')
      if (cycleType === 'testing') return name.includes('试油') || name.includes('测试') || name.includes('试气')
      if (cycleType === 'drilling') return !name.includes('搬安') && !name.includes('完井') && !(name.includes('试油') || name.includes('测试') || name.includes('试气'))
      return true
    }
    rows = rows.filter(match)
    const aggBy = (key: 'level2' | 'level3') => {
      const mapProd = new Map<string, number>()
      const mapNon = new Map<string, number>()
      for (const r of rows) {
        const k = (r[key] || '未分类') as string
        const h = Number(r.hours)
        if (r.level1 === '生产时效') mapProd.set(k, (mapProd.get(k) || 0) + h)
        else if (r.level1 === '非生产时效') mapNon.set(k, (mapNon.get(k) || 0) + h)
      }
      const cats = Array.from(new Set([...mapProd.keys(), ...mapNon.keys()]))
      const prod = cats.map(c => mapProd.get(c) || 0)
      const non = cats.map(c => mapNon.get(c) || 0)
      return { categories: cats, production: prod, nonProduction: non }
    }
    return { byLevel2: aggBy('level2'), byLevel3: aggBy('level3') }
  }

  async contractTemplate() {
    const header = ['井号', '合同生产时间(小时)', '合同非生产时间(小时)', '合同中完时间(小时)', '合同搬家周期(小时)', '合同完井周期(小时)', '合同钻井周期(小时)']
    const rules = [
      ['填写规则'],
      ['1. 井号为必填，需与实际进度井号一致'],
      ['2. 所有时间单位为小时，支持小数'],
      ['3. 每行一口井的合同指标，重复井号将以最后一行覆盖'],
      ['4. 列顺序必须与模板一致，不得改动列名']
    ]
    return { header, rules }
  }

  async importContract(projectId: number, rows: Array<{ wellNumber: string; productionTime: number; nonProductionTime: number; completionTime: number; movingPeriod: number; wellCompletionPeriod: number; drillingPeriod: number }>) {
    const project = await this.projectsRepo.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const normalized = rows.filter(r => r.wellNumber).map(r => this.contractsRepo.create({ project, ...r }))
    if (normalized.length === 0) return { ok: false, error: '无有效数据' }
    const wellSet = Array.from(new Set(normalized.map(n => n.wellNumber)))
    for (const wn of wellSet) {
      await this.contractsRepo.createQueryBuilder().delete().where('projectId = :pid AND wellNumber = :wn', { pid: projectId, wn }).execute()
    }
    await this.contractsRepo.save(normalized)
    return { ok: true, count: normalized.length }
  }

  async getContract(projectId: number, wellNumber?: string) {
    if (!wellNumber) {
      return null
    }
    const rec = await this.contractsRepo.findOne({ where: { project: { id: projectId } as any, wellNumber } })
    if (!rec) return null
    return {
      productionTime: Number(rec.productionTime || 0),
      nonProductionTime: Number(rec.nonProductionTime || 0),
      completionTime: Number(rec.completionTime || 0),
      movingPeriod: Number(rec.movingPeriod || 0),
      wellCompletionPeriod: Number(rec.wellCompletionPeriod || 0),
      drillingPeriod: Number(rec.drillingPeriod || 0)
    }
  }
}