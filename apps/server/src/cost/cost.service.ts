import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CostEvent } from './entities/cost-event.entity'
import { CostPlan } from './entities/cost-plan.entity'
import { RevenueEvent } from '../revenue/entities/revenue-event.entity'
import { Project } from '../projects/entities/project.entity'
import { ProgressPlan } from '../progress/entities/progress-plan.entity'
import { ProgressEvent } from '../progress/entities/progress-event.entity'

@Injectable()
export class CostService {
  constructor(
    @InjectRepository(CostEvent) private repo: Repository<CostEvent>,
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(CostPlan) private plans: Repository<CostPlan>
    ,@InjectRepository(RevenueEvent) private revenues: Repository<RevenueEvent>,
    @InjectRepository(ProgressPlan) private progressPlans: Repository<ProgressPlan>,
    @InjectRepository(ProgressEvent) private progressEvents: Repository<ProgressEvent>
  ) {}

  async summary(projectId: number, from?: string, to?: string, taskName?: string, wellNumber?: string) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    const qb = this.repo.createQueryBuilder('e').leftJoin('e.project', 'p').where('p.id = :id', { id: projectId })
    if (from) qb.andWhere('e.date >= :from', { from })
    if (to) qb.andWhere('e.date <= :to', { to })
    if (taskName) qb.andWhere('e.taskName = :task', { task: taskName })
    if (wellNumber) qb.andWhere('e.wellNumber = :wn', { wn: wellNumber })
    const rows = await qb.getMany()
    const total = rows.reduce((s, r) => s + Number(r.totalCost || 0), 0)
    const byL2 = new Map<string, number>()
    for (const r of rows) byL2.set(r.groupLevel2, (byL2.get(r.groupLevel2) || 0) + Number(r.totalCost || 0))
    const categories = Array.from(byL2.keys())
    const values = categories.map(c => byL2.get(c) || 0)
    return { total, currency: project?.amountCurrency || '', chart: { categories, values }, rows }
  }

  async import(projectId: number, items: Array<{ wellNumber: string; taskName: string; groupLevel1: string; groupLevel2: string; groupLevel3: string; groupLevel4?: string; unit?: string; unitPrice?: number; quantity?: number; totalCost: number }>) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const filtered = items.filter(i => i.taskName && i.groupLevel1 && i.groupLevel2 && i.groupLevel3)
    const pairs = Array.from(new Set(filtered.map(i => `${i.wellNumber}|${i.taskName}`)))
    const invalid: string[] = []
    for (const key of pairs) {
      const [wn, t] = key.split('|')
      const planExists = await this.progressPlans.findOne({ where: { project: { id: projectId } as any, wellNumber: wn, taskName: t } })
      const eventExists = await this.progressEvents.findOne({ where: { project: { id: projectId } as any, wellNumber: wn, taskName: t } as any })
      if (!planExists && !eventExists) invalid.push(`${wn}-${t}`)
    }
    if (invalid.length) return { ok: false, error: `任务名称不一致：${invalid.join(', ')}` }
    const wells = Array.from(new Set(filtered.map(i => i.wellNumber).filter(Boolean)))
    if (wells.length) {
      await this.repo.createQueryBuilder()
        .delete()
        .where('projectId = :pid AND wellNumber IN (:...wells)', { pid: projectId, wells })
        .execute()
    }
    const out = filtered.map(i => this.repo.create({ project, ...i }))
    if (out.length) await this.repo.save(out)
    return { ok: true, count: out.length, replacedTasks: wells.length }
  }

  async clear(projectId?: number) {
    if (projectId) await this.repo.createQueryBuilder().delete().where('projectId = :pid', { pid: projectId }).execute()
    else await this.repo.createQueryBuilder().delete().execute()
    return { ok: true }
  }

  async clearBudget(projectId?: number) {
    if (projectId) await this.plans.createQueryBuilder().delete().where('projectId = :pid', { pid: projectId }).execute()
    else await this.plans.createQueryBuilder().delete().execute()
    return { ok: true }
  }

  async clearAll(projectId?: number) {
    await this.clear(projectId)
    await this.clearBudget(projectId)
    return { ok: true }
  }

  async importPlan(projectId: number, items: Array<{ taskName: string; projectBudget?: number; taskBudget?: number; budgetLabor?: number; budgetMaterials?: number; budgetEquipment?: number; budgetServices?: number }>) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const out = items.filter(i => i.taskName).map(i => this.plans.create({ project, ...i }))
    if (out.length) await this.plans.save(out)
    return { ok: true, count: out.length }
  }

  async sixRadar(projectId: number, taskName?: string, wellNumber?: string) {
    const where: any = { project: { id: projectId } as any }
    if (taskName) where.taskName = taskName
    if (wellNumber) where.wellNumber = wellNumber
    const rows = await this.repo.find({ where })
    const pWhere: any = { project: { id: projectId } as any }
    if (taskName) pWhere.taskName = taskName
    if (wellNumber) pWhere.wellNumber = wellNumber
    const plans = await this.plans.find({ where: pWhere })
    const sumByL2 = (p: string) => rows.filter(r => r.groupLevel2 === p).reduce((s, r) => s + Number(r.totalCost || 0), 0)
    const labor = sumByL2('项目直接成本-人工费')
    const materials = sumByL2('项目直接成本-材料费')
    const equipment = sumByL2('项目直接成本-设备费')
    const services = sumByL2('项目直接成本-服务费')
    const direct = labor + materials + equipment + services
    const indirect = rows.filter(r => r.groupLevel1 === '项目间接成本').reduce((s, r) => s + Number(r.totalCost || 0), 0)
    const taskTotal = rows.reduce((s, r) => s + Number(r.totalCost || 0), 0)
    const clamp = (x: number, min: number, max: number) => Math.min(Math.max(x, min), max)
    const scoreUp = (pct: number, minForOne = 0, maxForFive = 12) => {
      if (pct < 0) return 0
      const t = clamp((pct - minForOne) / (maxForFive - minForOne), 0, 1)
      return Number((1 + t * 4).toFixed(2))
    }
    const budgetLabor = plans.reduce((s, p) => s + Number(p.budgetLabor || 0), 0)
    const budgetMaterials = plans.reduce((s, p) => s + Number(p.budgetMaterials || 0), 0)
    const budgetEquipment = plans.reduce((s, p) => s + Number(p.budgetEquipment || 0), 0)
    const budgetServices = plans.reduce((s, p) => s + Number(p.budgetServices || 0), 0)
    const laborRate = budgetLabor > 0 ? ((budgetLabor - labor) / budgetLabor) * 100 : 0
    const materialsRate = budgetMaterials > 0 ? ((budgetMaterials - materials) / budgetMaterials) * 100 : 0
    const equipmentRate = budgetEquipment > 0 ? ((budgetEquipment - equipment) / budgetEquipment) * 100 : 0
    const servicesRate = budgetServices > 0 ? ((budgetServices - services) / budgetServices) * 100 : 0
    const laborScore = scoreUp(laborRate)
    const materialsScore = scoreUp(materialsRate)
    const equipmentScore = scoreUp(equipmentRate)
    const servicesScore = scoreUp(servicesRate)
    const taskBudgetSum = plans.reduce((s, p) => {
      const direct = Number(p.budgetLabor || 0) + Number(p.budgetMaterials || 0) + Number(p.budgetEquipment || 0) + Number(p.budgetServices || 0)
      const indirect = Number((p as any).budgetIndirect || 0)
      const total = p.taskBudget != null ? Number(p.taskBudget) : (direct + indirect)
      return s + total
    }, 0)
    const taskRate = taskBudgetSum > 0 ? (taskTotal / taskBudgetSum) * 100 : 0
    const scoreDown = (val: number, bestForFive: number, worstForOne: number, zeroAbove?: number) => {
      if (zeroAbove !== undefined && val > zeroAbove) return 0
      const t = clamp((worstForOne - val) / (worstForOne - bestForFive), 0, 1)
      return Number((1 + t * 4).toFixed(2))
    }
    const taskScore = scoreDown(taskRate, 85, 100, 100)
    const indirectRatio = direct > 0 ? (indirect / direct) * 100 : 0
    const indirectScore = scoreDown(indirectRatio, 8, 18, 18)
    const scores = {
      materials: materialsScore,
      labor: laborScore,
      equipment: equipmentScore,
      services: servicesScore,
      taskTotal: taskScore,
      indirectRatio: indirectScore
    }
    const overall = Number(((scores.materials + scores.labor + scores.equipment + scores.services + scores.taskTotal + scores.indirectRatio) / 6).toFixed(2))
    return {
      ok: true,
      scores,
      overall,
      details: {
        budgetMaterials,
        budgetLabor,
        budgetEquipment,
        budgetServices,
        materials,
        labor,
        equipment,
        services,
        taskBudgetSum,
        taskTotal,
        direct,
        indirect
      }
    }
  }

  async kpis(projectId: number, taskName?: string, wellNumber?: string) {
    const [project] = await Promise.all([
      this.projects.findOne({ where: { id: projectId } })
    ])
    const cWhere: any = { project: { id: projectId } as any }
    if (taskName) cWhere.taskName = taskName
    if (wellNumber) cWhere.wellNumber = wellNumber
    const costsScope = await this.repo.find({ where: cWhere })
    const costsAll = await this.repo.find({ where: { project: { id: projectId } as any } })
    const pWhere: any = { project: { id: projectId } as any }
    if (taskName) pWhere.taskName = taskName
    if (wellNumber) pWhere.wellNumber = wellNumber
    const plans = await this.plans.find({ where: pWhere })
    const revs = await this.revenues.find({ where: { project: { id: projectId } as any } })
    const AC = costsAll.reduce((s, r) => s + Number(r.totalCost || 0), 0)
    const scopeAC = costsScope.reduce((s, r) => s + Number(r.totalCost || 0), 0)
    const projectTotalBudget = Number(project?.amountValue || 0)
    const taskTotalBudget = plans.reduce((sum, p) => {
      const direct = Number(p.budgetLabor || 0) + Number(p.budgetMaterials || 0) + Number(p.budgetEquipment || 0) + Number(p.budgetServices || 0)
      const indirect = Number((p as any).budgetIndirect || 0)
      const total = p.taskBudget != null ? Number(p.taskBudget) : (direct + indirect)
      return sum + total
    }, 0)
    const projectTotalRevenue = revs.reduce((s, r) => s + Number(r.amount || 0), 0)
    const targetWell = wellNumber || undefined
    const revsScope = revs.filter(r => {
      const matchTask = taskName ? String((r as any).taskName || (r as any).item || '') === taskName : true
      const matchWell = targetWell ? String((r as any).wellNo || '') === targetWell : true
      return matchTask && matchWell
    })
    const scopeRevenue = revsScope.reduce((s, r) => s + Number((r as any).amount || 0), 0)
    const EV = revs.reduce((s, r: any) => s + Number(r.totalWorkValueUSD || 0), 0)
    const CPI = AC > 0 ? EV / AC : 0
    const ETC = CPI > 0 ? (projectTotalBudget - EV) / CPI : 0
    const EAC = CPI > 0 ? projectTotalBudget / CPI : 0
    const CV = projectTotalBudget - AC
    const projectRemainingBudget = projectTotalBudget - AC
    return { projectTotalBudget, taskTotalBudget, projectRemainingBudget, projectTotalRevenue, AC, EV, CV, CPI, ETC, EAC, scopeAC, scopeRevenue, currency: project?.amountCurrency || '' }
  }

  async tasks(projectId: number, wellNumber?: string) {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoin('e.project', 'p')
      .where('p.id = :id', { id: projectId })
      .select('DISTINCT e.taskName', 'taskName')
    if (wellNumber) qb.andWhere('e.wellNumber = :wn', { wn: wellNumber })
    const rows = await qb.getRawMany()
    return rows.map(r => r.taskName).filter(Boolean)
  }

  async wells(projectId: number) {
    const rows = await this.repo
      .createQueryBuilder('e')
      .leftJoin('e.project', 'p')
      .where('p.id = :id', { id: projectId })
      .select('DISTINCT e.wellNumber', 'wellNumber')
      .getRawMany()
    return rows.map(r => r.wellNumber).filter((w: string) => !!w)
  }

  async importBudget(projectId: number, items: Array<{ wellNumber?: string; taskName: string; groupLevel2: string; budget: number }>) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const wellsToReplace = Array.from(new Set(items.map(i => i.wellNumber).filter(Boolean))) as string[]
    if (wellsToReplace.length) {
      await this.plans.createQueryBuilder()
        .delete()
        .where('projectId = :pid AND wellNumber IN (:...wells)', { pid: projectId, wells: wellsToReplace })
        .execute()
    }
    const byTask = new Map<string, Partial<CostPlan>>()
    for (const it of items) {
      const key = it.taskName
      const curr = byTask.get(key) || {}
      if (it.wellNumber) (curr as any).wellNumber = it.wellNumber
      if (it.groupLevel2 === '项目直接成本-人工费') (curr as any).budgetLabor = Number((curr as any).budgetLabor || 0) + it.budget
      else if (it.groupLevel2 === '项目直接成本-材料费') (curr as any).budgetMaterials = Number((curr as any).budgetMaterials || 0) + it.budget
      else if (it.groupLevel2 === '项目直接成本-设备费') (curr as any).budgetEquipment = Number((curr as any).budgetEquipment || 0) + it.budget
      else if (it.groupLevel2 === '项目直接成本-服务费') (curr as any).budgetServices = Number((curr as any).budgetServices || 0) + it.budget
      else if (it.groupLevel2 === '项目间接成本-分摊费' || it.groupLevel2 === '项目间接成本-计提费') (curr as any).budgetIndirect = Number((curr as any).budgetIndirect || 0) + it.budget
      byTask.set(key, curr)
    }
    for (const [taskName, patch] of byTask) {
      let plan = await this.plans.findOne({ where: { project: { id: projectId } as any, taskName } })
      if (!plan) plan = this.plans.create({ project, taskName })
      Object.assign(plan, patch)
      await this.plans.save(plan)
    }
    return { ok: true, count: items.length }
  }
}