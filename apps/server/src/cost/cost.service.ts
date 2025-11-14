import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CostEvent } from './entities/cost-event.entity'
import { CostPlan } from './entities/cost-plan.entity'
import { RevenueEvent } from '../revenue/entities/revenue-event.entity'
import { Project } from '../projects/entities/project.entity'

@Injectable()
export class CostService {
  constructor(
    @InjectRepository(CostEvent) private repo: Repository<CostEvent>,
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(CostPlan) private plans: Repository<CostPlan>
    ,@InjectRepository(RevenueEvent) private revenues: Repository<RevenueEvent>
  ) {}

  async summary(projectId: number, from?: string, to?: string, taskName?: string) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    const qb = this.repo.createQueryBuilder('e').leftJoin('e.project', 'p').where('p.id = :id', { id: projectId })
    if (from) qb.andWhere('e.date >= :from', { from })
    if (to) qb.andWhere('e.date <= :to', { to })
    if (taskName) qb.andWhere('e.taskName = :task', { task: taskName })
    const rows = await qb.getMany()
    const total = rows.reduce((s, r) => s + Number(r.totalCost || 0), 0)
    const byL2 = new Map<string, number>()
    for (const r of rows) byL2.set(r.groupLevel2, (byL2.get(r.groupLevel2) || 0) + Number(r.totalCost || 0))
    const categories = Array.from(byL2.keys())
    const values = categories.map(c => byL2.get(c) || 0)
    return { total, currency: project?.amountCurrency || '', chart: { categories, values }, rows }
  }

  async import(projectId: number, items: Array<{ taskName: string; groupLevel1: string; groupLevel2: string; groupLevel3: string; groupLevel4?: string; unit?: string; unitPrice?: number; quantity?: number; totalCost: number; revenue?: number }>) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const filtered = items.filter(i => i.taskName && i.groupLevel1 && i.groupLevel2 && i.groupLevel3)
    const tasks = Array.from(new Set(filtered.map(i => i.taskName)))
    for (const t of tasks) {
      await this.repo.createQueryBuilder().delete().where('projectId = :pid AND taskName = :task', { pid: projectId, task: t }).execute()
    }
    const out = filtered.map(i => this.repo.create({ project, ...i }))
    if (out.length) await this.repo.save(out)
    return { ok: true, count: out.length, replacedTasks: tasks.length }
  }

  async clear(projectId?: number) {
    if (projectId) await this.repo.createQueryBuilder().delete().where('projectId = :pid', { pid: projectId }).execute()
    else await this.repo.createQueryBuilder().delete().execute()
    return { ok: true }
  }

  async importPlan(projectId: number, items: Array<{ taskName: string; projectBudget?: number; taskBudget?: number; budgetLabor?: number; budgetMaterials?: number; budgetEquipment?: number; budgetServices?: number }>) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const out = items.filter(i => i.taskName).map(i => this.plans.create({ project, ...i }))
    if (out.length) await this.plans.save(out)
    return { ok: true, count: out.length }
  }

  async sixRadar(projectId: number, taskName?: string) {
    const rows = taskName
      ? await this.repo.find({ where: { project: { id: projectId } as any, taskName } })
      : await this.repo.find({ where: { project: { id: projectId } as any } })
    const plans = taskName
      ? await this.plans.find({ where: { project: { id: projectId } as any, taskName } })
      : await this.plans.find({ where: { project: { id: projectId } as any } })
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
    const taskBudgetSum = budgetLabor + budgetMaterials + budgetEquipment + budgetServices
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

  async kpis(projectId: number, taskName?: string) {
    const [project, costs, plans, revs] = await Promise.all([
      this.projects.findOne({ where: { id: projectId } }),
      this.repo.find({ where: { project: { id: projectId } as any } }),
      this.plans.find({ where: { project: { id: projectId } as any } }),
      this.revenues.find({ where: { project: { id: projectId } as any } })
    ])
    const AC = costs.reduce((s, r) => s + Number(r.totalCost || 0), 0)
    const projectTotalBudget = Number(project?.amountValue || 0)
    const pTask = taskName ? plans.find(p => p.taskName === taskName) : undefined
    const taskTotalBudget = pTask ? Number(pTask.budgetLabor || 0) + Number(pTask.budgetMaterials || 0) + Number(pTask.budgetEquipment || 0) + Number(pTask.budgetServices || 0) : 0
    const projectTotalRevenue = revs.reduce((s, r) => s + Number(r.amount || 0), 0)
    const EV = revs.reduce((s, r) => s + Number(r.amount || 0), 0)
    const CV = EV - AC
    const CPI = AC > 0 ? EV / AC : 0
    const ETC = CPI > 0 ? (projectTotalBudget - EV) / CPI : 0
    const EAC = AC + ETC
    const projectRemainingBudget = projectTotalBudget - AC
    return { projectTotalBudget, taskTotalBudget, projectRemainingBudget, projectTotalRevenue, AC, EV, CV, CPI, ETC, EAC, currency: project?.amountCurrency || '' }
  }

  async tasks(projectId: number) {
    const rows = await this.repo
      .createQueryBuilder('e')
      .leftJoin('e.project', 'p')
      .where('p.id = :id', { id: projectId })
      .select('DISTINCT e.taskName', 'taskName')
      .getRawMany()
    return rows.map(r => r.taskName).filter(Boolean)
  }

  async importBudget(projectId: number, items: Array<{ taskName: string; groupLevel2: string; budget: number }>) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const byTask = new Map<string, Partial<CostPlan>>()
    for (const it of items) {
      const curr = byTask.get(it.taskName) || {}
      if (it.groupLevel2 === '项目直接成本-人工费') curr.budgetLabor = it.budget
      else if (it.groupLevel2 === '项目直接成本-材料费') curr.budgetMaterials = it.budget
      else if (it.groupLevel2 === '项目直接成本-设备费') curr.budgetEquipment = it.budget
      else if (it.groupLevel2 === '项目直接成本-服务费') curr.budgetServices = it.budget
      byTask.set(it.taskName, curr)
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