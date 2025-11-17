import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProjectGoal } from './entities/project-goal.entity'
import { Project } from '../projects/entities/project.entity'
import { CreateProjectGoalDto } from './dto/create-project-goal.dto'
import { ProgressService } from '../progress/progress.service'
import { CostService } from '../cost/cost.service'
import { RevenueService } from '../revenue/revenue.service'

@Injectable()
export class ProjectGoalsService {
  constructor(
    @InjectRepository(ProjectGoal) private repo: Repository<ProjectGoal>,
    @InjectRepository(Project) private projects: Repository<Project>,
    private progress: ProgressService,
    private cost: CostService,
    private revenue: RevenueService
  ) {}

  async list(projectId: number) {
    return this.repo.find({ where: { project: { id: projectId } as any } })
  }

  async setAll(projectId: number, goals: CreateProjectGoalDto[]) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    await this.repo.createQueryBuilder().delete().where('projectId = :pid', { pid: projectId }).execute()
    const out = goals.map(g => this.repo.create({ project, dimension: g.dimension, indicatorKey: g.indicatorKey, comparator: g.comparator || '>=', targetValue: g.targetValue, unit: g.unit, wellNumber: g.wellNumber, taskName: g.taskName }))
    if (out.length) await this.repo.save(out)
    return { ok: true, count: out.length }
  }

  async remove(projectId: number, goalId: number) {
    await this.repo.delete({ id: goalId, project: { id: projectId } as any } as any)
    return { ok: true }
  }

  private compare(val: number | null | undefined, cmp: string, target: number) {
    if (val == null) return false
    if (cmp === '>=') return val >= target
    if (cmp === '>') return val > target
    if (cmp === '<=') return val <= target
    if (cmp === '<') return val < target
    if (cmp === '=') return val === target
    return val >= target
  }

  private async evalProgress(projectId: number, g: ProjectGoal) {
    const dash = await this.progress.dashboard(projectId, g.taskName || undefined, undefined, undefined, g.wellNumber || undefined)
    const toPct = (a: number, b: number) => b > 0 ? (a / b) * 100 : 0
    if (g.indicatorKey === 'nonProductiveTimeRatio') {
      const v = toPct(Number((dash as any).drillingNonProductionTime || 0), Number((dash as any).drillingProductionTime || 0))
      return { value: Number(v.toFixed(2)) }
    }
    if (g.indicatorKey === 'pureDrillTimeRatio') {
      const v = toPct(Number((dash as any).pureDrillingTime || 0), Number((dash as any).footageWorkingTime || 0))
      return { value: Number(v.toFixed(2)) }
    }
    if (g.indicatorKey === 'movingPeriodRatio') {
      const v = toPct(Number((dash as any).movingCycleTime || 0), Number((dash as any).wellBuildingCycleTime || 0))
      return { value: Number(v.toFixed(2)) }
    }
    if (g.indicatorKey === 'scheduleOverdueDays') {
      const cmp = await this.progress.planCompare(projectId, g.wellNumber || undefined)
      const days = (cmp.rows || []).map((r: any) => Number(r.completionDeltaDays || 0)).filter(d => d > 0)
      const v = days.length ? Math.max(...days) : 0
      return { value: v }
    }
    return { value: null }
  }

  private async evalCost(projectId: number, g: ProjectGoal) {
    const kpis = await this.cost.kpis(projectId, g.taskName || undefined, g.wellNumber || undefined)
    if (g.indicatorKey === 'costControlRate') {
      const v = kpis.taskTotalBudget > 0 ? (kpis.AC / kpis.taskTotalBudget) * 100 : 0
      return { value: Number(v.toFixed(2)) }
    }
    if (g.indicatorKey === 'hundredRevenueCost') {
      const v = kpis.projectTotalRevenue > 0 ? (kpis.AC / kpis.projectTotalRevenue) * 100 : 0
      return { value: Number(v.toFixed(2)) }
    }
    if (g.indicatorKey === 'costOverrunSingleTask') {
      const scopeBudget = kpis.taskTotalBudget
      const scopeAC = kpis.scopeAC
      const v = scopeBudget > 0 ? (scopeAC / scopeBudget) * 100 : 0
      return { value: Number(v.toFixed(2)) }
    }
    const radar = await this.cost.sixRadar(projectId, g.taskName || undefined, g.wellNumber || undefined)
    if (g.indicatorKey === 'indirectCostControlRate') {
      const d = radar.details
      const v = d.direct > 0 ? (d.indirect / d.direct) * 100 : 0
      return { value: Number(v.toFixed(2)) }
    }
    if (g.indicatorKey === 'costPerformanceScore') {
      return { value: radar.overall }
    }
    if (g.indicatorKey === 'materialsCostAmount') return { value: radar.details.materials }
    if (g.indicatorKey === 'laborCostAmount') return { value: radar.details.labor }
    if (g.indicatorKey === 'equipmentCostAmount') return { value: radar.details.equipment }
    if (g.indicatorKey === 'servicesCostAmount') return { value: radar.details.services }
    return { value: null }
  }

  private async evalRevenue(projectId: number, g: ProjectGoal) {
    const k = await this.cost.kpis(projectId, g.taskName || undefined, g.wellNumber || undefined)
    if (g.indicatorKey === 'earnedValueAmount') return { value: k.EV }
    if (g.indicatorKey === 'projectProfitPercent') {
      const v = k.projectTotalRevenue > 0 ? ((k.projectTotalRevenue - k.AC) / k.projectTotalRevenue) * 100 : 0
      return { value: Number(v.toFixed(2)) }
    }
    return { value: null }
  }

  async evaluateOne(projectId: number, g: ProjectGoal) {
    let val: number | null = null
    if (g.dimension === 'progress') val = (await this.evalProgress(projectId, g)).value
    else if (g.dimension === 'cost') val = (await this.evalCost(projectId, g)).value
    else if (g.dimension === 'revenue') val = (await this.evalRevenue(projectId, g)).value
    const completed = this.compare(val, g.comparator, Number(g.targetValue))
    return { goalId: g.id, value: val, comparator: g.comparator, targetValue: Number(g.targetValue), completed, dimension: g.dimension, indicatorKey: g.indicatorKey, unit: g.unit || '' }
  }

  async evaluateAll(projectId: number) {
    const goals = await this.list(projectId)
    const results = await Promise.all(goals.map(g => this.evaluateOne(projectId, g)))
    const supported = results.filter(r => r.value != null)
    const summary = { total: results.length, completed: supported.filter(r => r.completed).length, unsupported: results.length - supported.length }
    return { results, summary }
  }
}