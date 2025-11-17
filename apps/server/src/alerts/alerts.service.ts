import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AlertRule } from './entities/alert-rule.entity'
import { AlertEvent } from './entities/alert-event.entity'
import { Project } from '../projects/entities/project.entity'
import { AlertRecord } from './entities/alert-record.entity'
import { AlertConfig } from './entities/alert-config.entity'
import { ProgressService } from '../progress/progress.service'
import { CostService } from '../cost/cost.service'
import { RevenueService } from '../revenue/revenue.service'

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertRule) private rules: Repository<AlertRule>,
    @InjectRepository(AlertEvent) private events: Repository<AlertEvent>,
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(AlertRecord) private records: Repository<AlertRecord>,
    @InjectRepository(AlertConfig) private configs: Repository<AlertConfig>,
    private readonly progress: ProgressService,
    private readonly cost: CostService,
    private readonly revenue: RevenueService
  ) {}

  async list(projectId: number) {
    const rules = await this.rules.find({ where: { project: { id: projectId } as any } })
    const events = await this.events.find({ where: { project: { id: projectId } as any } })
    return { rules, events }
  }

  async addRule(projectId: number, rule: { name: string; condition: string; level: string }) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const r = this.rules.create({ project, ...rule })
    await this.rules.save(r)
    return { ok: true, id: r.id }
  }

  async addEvent(projectId: number, ev: { name: string; level: string; date: string; detail: string }) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const e = this.events.create({ project, ...ev })
    await this.events.save(e)
    return { ok: true, id: e.id }
  }

  async clear(projectId?: number) {
    if (projectId) {
      await this.rules.createQueryBuilder().delete().where('projectId = :pid', { pid: projectId }).execute()
      await this.events.createQueryBuilder().delete().where('projectId = :pid', { pid: projectId }).execute()
      await this.records.createQueryBuilder().delete().where('projectId = :pid', { pid: projectId }).execute()
    } else {
      await this.rules.createQueryBuilder().delete().execute()
      await this.events.createQueryBuilder().delete().execute()
      await this.records.createQueryBuilder().delete().execute()
    }
    return { ok: true }
  }

  async listRecords(projectId: number, status?: string, type?: string, severity?: string, from?: string, to?: string) {
    const qb = this.records.createQueryBuilder('r').leftJoinAndSelect('r.project', 'p').where('p.id = :pid', { pid: projectId })
    if (status) qb.andWhere('r.status = :st', { st: status })
    if (type) qb.andWhere('r.alertType = :tp', { tp: type })
    if (severity) qb.andWhere('r.severity = :sv', { sv: severity })
    if (from) qb.andWhere('r.createdAt >= :from', { from })
    if (to) qb.andWhere('r.createdAt <= :to', { to })
    qb.orderBy('r.createdAt', 'DESC')
    const rows = await qb.getMany()
    const typeMap: Record<string, string> = { progress: '进度', cost: '成本', revenue: '收入' }
    const sevMap: Record<string, string> = { warning: '警告', critical: '严重' }
    const statusMap: Record<string, string> = { active: '活跃', resolved: '已解决', ignored: '已忽略' }
    return rows.map(r => ({
      ...r,
      projectName: (r.project as any)?.name || (r.project as any)?.contractNo || '',
      alertTypeText: typeMap[r.alertType] || r.alertType,
      severityText: sevMap[r.severity] || r.severity,
      statusText: statusMap[r.status] || r.status
    }))
  }

  async listConfigs(projectId?: number) {
    const globals = await this.configs.find({ where: { project: null } as any })
    const locals = projectId ? await this.configs.find({ where: { project: { id: projectId } as any } }) : []
    const key = (c: AlertConfig) => `${c.alertType}::${c.alertItem}`
    const map = new Map<string, AlertConfig>()
    for (const g of globals) map.set(key(g), g)
    for (const l of locals) map.set(key(l), l)
    return Array.from(map.values())
  }

  async saveConfigs(projectId: number | null, items: Array<{ alertType: string; alertItem: string; thresholdType: string; warningThreshold: number; criticalThreshold: number; isActive?: boolean }>) {
    const project = projectId != null ? await this.projects.findOne({ where: { id: projectId } }) : null
    const now = new Date().toISOString().slice(0, 19)
    const out = items.map(i => this.configs.create({ project: project || null, ...i, isActive: i.isActive ?? true, createdAt: now, updatedAt: now }))
    const keys = Array.from(new Set(out.map(o => `${projectId ?? 'global'}::${o.alertType}::${o.alertItem}`)))
    for (const k of keys) {
      const [, type, item] = k.split('::')
      if (project) await this.configs.createQueryBuilder().delete().where('projectId = :pid AND alertType = :t AND alertItem = :i', { pid: projectId!, t: type, i: item }).execute()
      else await this.configs.createQueryBuilder().delete().where('projectId IS NULL AND alertType = :t AND alertItem = :i', { t: type, i: item }).execute()
    }
    if (out.length) await this.configs.save(out)
    return { ok: true, count: out.length }
  }

  private async evaluatePlanStatus(projectId: number | null, item: { alertType: string; alertItem: string; scopeType?: string; scopeValue?: string; requiresPlan?: boolean }) {
    if (!item.requiresPlan) return 'unknown'
    const pid = projectId ?? null
    if (item.alertType === 'progress') {
      // check ProgressPlan
      const where: any = { project: { id: pid } as any }
      if (item.scopeType === 'conditionName' && item.scopeValue) where.conditionName = item.scopeValue
      if (item.scopeType === 'taskName' && item.scopeValue) where.taskName = item.scopeValue
      const repo = (this as any).plans ?? undefined
      try {
        const exists = await (this as any).plans.findOne({ where })
        return exists ? 'ok' : 'missing'
      } catch { return 'unknown' }
    }
    if (item.alertType === 'cost') {
      // check CostPlan
      try {
        const where: any = { project: { id: pid } as any }
        if (item.scopeType === 'taskName' && item.scopeValue) where.taskName = item.scopeValue
        const exists = await (this as any).plans.findOne({ where })
        return exists ? 'ok' : 'missing'
      } catch { return 'unknown' }
    }
    if (item.alertType === 'revenue') {
      // check RevenueEvent with plannedEnd
      try {
        const where: any = { project: { id: pid } as any }
        if (item.scopeType === 'taskName' && item.scopeValue) where.taskName = item.scopeValue
        if (item.scopeType === 'item' && item.scopeValue) where.item = item.scopeValue
        where.plannedEnd = (this as any).Not ? (this as any).Not(null) : undefined
        const exists = await (this as any).revenues.findOne({ where })
        return exists ? 'ok' : 'missing'
      } catch { return 'unknown' }
    }
    return 'unknown'
  }

  async createConfig(projectId: number | null, item: { alertType: string; alertItem: string; thresholdType: string; warningThreshold: number; criticalThreshold: number; isActive?: boolean; scopeType?: string; scopeValue?: string; requiresPlan?: boolean }) {
    const project = projectId != null ? await this.projects.findOne({ where: { id: projectId } }) : null
    const now = new Date().toISOString().slice(0, 19)
    const planStatus = await this.evaluatePlanStatus(projectId, item)
    const entity = this.configs.create({ project: project || null, ...item, planStatus, isActive: item.isActive ?? true, createdAt: now, updatedAt: now })
    await this.configs.save(entity)
    return { ok: true, id: entity.id }
  }

  async updateConfig(id: number, patch: Partial<{ alertType: string; alertItem: string; thresholdType: string; warningThreshold: number; criticalThreshold: number; isActive: boolean; scopeType?: string; scopeValue?: string; requiresPlan?: boolean }>) {
    const conf = await this.configs.findOne({ where: { id } })
    if (!conf) return { ok: false, error: '配置不存在' }
    Object.assign(conf, patch)
    if (patch.requiresPlan !== undefined || patch.scopeType !== undefined || patch.scopeValue !== undefined) {
      conf.planStatus = await this.evaluatePlanStatus(conf.project ? conf.project.id : null, conf as any)
    }
    conf.updatedAt = new Date().toISOString().slice(0, 19)
    await this.configs.save(conf)
    return { ok: true }
  }

  async deleteConfig(id: number) {
    const conf = await this.configs.findOne({ where: { id } })
    if (!conf) return { ok: false, error: '配置不存在' }
    await this.configs.delete({ id })
    return { ok: true }
  }

  async generateFromPlan(projectId: number) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const now = new Date().toISOString().slice(0, 19)
    const out: AlertConfig[] = []
    // progress: by ProgressPlan.conditionName
    try {
      const plans = await (this as any).plans.find({ where: { project: { id: projectId } as any } })
      const names = Array.from(new Set(plans.map((p: any) => p.conditionName).filter(Boolean)))
      const defaults = await this.configs.find({ where: { project: null, alertType: 'progress', alertItem: '计划逾期' } as any })
      const def = defaults[0]
      for (const n of names) {
        const planStatus = 'ok'
        const entity = this.configs.create({ project, alertType: 'progress', alertItem: '计划逾期', thresholdType: 'days', warningThreshold: Number(def?.warningThreshold ?? 3), criticalThreshold: Number(def?.criticalThreshold ?? 7), isActive: true, scopeType: 'conditionName', scopeValue: n, requiresPlan: true, planStatus, createdAt: now, updatedAt: now })
        out.push(entity)
      }
    } catch {}
    // cost: by CostPlan.taskName
    try {
      const costPlans = await (this as any).plans.find({ where: { project: { id: projectId } as any } })
      const tasks = Array.from(new Set(costPlans.map((p: any) => p.taskName).filter(Boolean)))
      const defaults = await this.configs.find({ where: { project: null, alertType: 'cost', alertItem: '成本超支' } as any })
      const def = defaults[0]
      for (const t of tasks) {
        const entity = this.configs.create({ project, alertType: 'cost', alertItem: '成本超支', thresholdType: 'percentage', warningThreshold: Number(def?.warningThreshold ?? 10), criticalThreshold: Number(def?.criticalThreshold ?? 20), isActive: true, scopeType: 'taskName', scopeValue: t, requiresPlan: true, planStatus: 'ok', createdAt: now, updatedAt: now })
        out.push(entity)
      }
    } catch {}
    if (out.length) await this.configs.save(out)
    return { ok: true, count: out.length }
  }

  async setRecordStatus(id: number, status: 'resolved' | 'ignored', note?: string) {
    const rec = await this.records.findOne({ where: { id } })
    if (!rec) return { ok: false, error: '记录不存在' }
    rec.status = status
    rec.resolvedAt = new Date().toISOString().slice(0, 19)
    if (note) rec.resolutionNote = note
    await this.records.save(rec)
    return { ok: true }
  }

  async deleteRecord(id: number) {
    const rec = await this.records.findOne({ where: { id } })
    if (!rec) return { ok: false, error: '记录不存在' }
    if (rec.status === 'active') return { ok: false, error: '只能删除历史记录' }
    await this.records.delete({ id })
    return { ok: true }
  }

  async check(projectId: number) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }

    const created: AlertRecord[] = []

    const cfgs = await this.listConfigs(projectId)
    const cfgMap = new Map<string, AlertConfig>()
    for (const c of cfgs) cfgMap.set(`${c.alertType}::${c.alertItem}`, c)

    const prog = await this.progress.planCompare(projectId)
    for (const row of prog.rows as any[]) {
      const delta = typeof row.completionDeltaDays === 'number' ? row.completionDeltaDays : 0
      // choose config: prefer scoped match, fallback to global
      const configs = Array.from(cfgMap.values()).filter(x => x.alertType === 'progress' && x.alertItem === '计划逾期' && x.isActive)
      const matchScoped = configs.find(x => (x.scopeType === 'conditionName' && x.scopeValue === row.conditionName) || (x.scopeType === 'wellNumber' && x.scopeValue === row.wellNumber))
      const chosen: any = matchScoped || configs.find(x => !x.scopeType)
      const warn = Number(chosen?.warningThreshold ?? 3)
      const crit = Number(chosen?.criticalThreshold ?? 7)
      const requiresPlan = !!chosen?.requiresPlan
      if (requiresPlan && (!row.planStartDate || !row.planEndDate)) continue
      if (delta > warn) {
        const severity = delta > crit ? 'critical' : 'warning'
        const message = `井号${row.wellNumber || ''} ${row.conditionName || ''} 比计划晚${delta}天`
        const key = `${row.wellNumber || ''}::${row.conditionName || ''}`
        const exist = await this.records.findOne({ where: { project: { id: projectId } as any, alertType: 'progress', alertItem: '计划逾期', status: 'active', dedupKey: key } as any })
        if (exist) {
          exist.severity = severity
          exist.message = message
          exist.relatedData = { wellNumber: row.wellNumber, conditionName: row.conditionName, completionDeltaDays: delta }
          await this.records.save(exist)
        } else {
          const rec = this.records.create({
            project,
            alertType: 'progress',
            alertItem: '计划逾期',
            severity,
            message,
            dedupKey: key,
            relatedData: { wellNumber: row.wellNumber, conditionName: row.conditionName, completionDeltaDays: delta },
            status: 'active',
            createdAt: new Date().toISOString().slice(0, 19)
          })
          created.push(rec)
        }
      }
    }

    const kpis = await this.cost.kpis(projectId)
    const budget = Number(kpis.projectTotalBudget || 0)
    const ac = Number(kpis.AC || 0)
    if (budget > 0) {
      const overPct = budget > 0 ? ((ac - budget) / budget) * 100 : 0
      const configs = Array.from(cfgMap.values()).filter(x => x.alertType === 'cost' && x.alertItem === '成本超支' && x.isActive)
      const chosen: any = configs.find(x => !x.scopeType) || configs[0]
      const warn = Number(chosen?.warningThreshold ?? 10)
      const crit = Number(chosen?.criticalThreshold ?? 20)
      if (overPct > warn) {
        const severity = overPct > crit ? 'critical' : 'warning'
        const message = `项目成本超支${overPct.toFixed(1)}%`
        const key = 'project::cost_overrun'
        const exist = await this.records.findOne({ where: { project: { id: projectId } as any, alertType: 'cost', alertItem: '成本超支', status: 'active', dedupKey: key } as any })
        if (exist) {
          exist.severity = severity
          exist.message = message
          exist.relatedData = { AC: ac, projectTotalBudget: budget, overPercent: overPct }
          await this.records.save(exist)
        } else {
          const rec = this.records.create({
            project,
            alertType: 'cost',
            alertItem: '成本超支',
            severity,
            message,
            dedupKey: key,
            relatedData: { AC: ac, projectTotalBudget: budget, overPercent: overPct },
            status: 'active',
            createdAt: new Date().toISOString().slice(0, 19)
          })
          created.push(rec)
        }
      }
    }

    const rev = await this.revenue.summary(projectId)
    const now = new Date()
    const toDate = (s?: string | null) => (s ? new Date(s) : null)
    for (const r of rev.rows as any[]) {
      const plannedEnd = toDate(r.plannedEnd)
      const confirmed = toDate(r.revenueConfirmedDate)
      const cash = toDate(r.cashDate)
      if (!confirmed && plannedEnd) {
        const diffDays = Math.round((now.getTime() - plannedEnd.getTime()) / 86400000)
        const configs = Array.from(cfgMap.values()).filter(x => x.alertType === 'revenue' && x.alertItem === '收入确认延误' && x.isActive)
        const matchScoped = configs.find(x => (x.scopeType === 'taskName' && x.scopeValue === (r.taskName || r.item)) || (x.scopeType === 'item' && x.scopeValue === r.item))
        const chosen: any = matchScoped || configs.find(x => !x.scopeType)
        const warn = Number(chosen?.warningThreshold ?? 15)
        const crit = Number(chosen?.criticalThreshold ?? 30)
        const requiresPlan = !!chosen?.requiresPlan
        if (requiresPlan && !r.plannedEnd) continue
        if (diffDays > warn) {
          const severity = diffDays > crit ? 'critical' : 'warning'
          const message = `收入确认逾期${diffDays}天：${r.item || r.taskName || ''}`
          const key = `${r.item || r.taskName || ''}::confirm_overdue`
          const exist = await this.records.findOne({ where: { project: { id: projectId } as any, alertType: 'revenue', alertItem: '收入确认延误', status: 'active', dedupKey: key } as any })
          if (exist) {
            exist.severity = severity
            exist.message = message
            exist.relatedData = { item: r.item, taskName: r.taskName, plannedEnd: r.plannedEnd, overdueDays: diffDays }
            await this.records.save(exist)
          } else {
            const rec = this.records.create({
              project,
              alertType: 'revenue',
              alertItem: '收入确认延误',
              severity,
              message,
              dedupKey: key,
              relatedData: { item: r.item, taskName: r.taskName, plannedEnd: r.plannedEnd, overdueDays: diffDays },
              status: 'active',
              createdAt: new Date().toISOString().slice(0, 19)
            })
            created.push(rec)
          }
        }
      }
      if (confirmed && !cash) {
        const diffDays = Math.round((now.getTime() - confirmed.getTime()) / 86400000)
        const configs = Array.from(cfgMap.values()).filter(x => x.alertType === 'revenue' && x.alertItem === '应收账款逾期' && x.isActive)
        const matchScoped = configs.find(x => (x.scopeType === 'taskName' && x.scopeValue === (r.taskName || r.item)) || (x.scopeType === 'item' && x.scopeValue === r.item))
        const chosen: any = matchScoped || configs.find(x => !x.scopeType)
        const warn = Number(chosen?.warningThreshold ?? 30)
        const crit = Number(chosen?.criticalThreshold ?? 60)
        if (diffDays > warn) {
          const severity = diffDays > crit ? 'critical' : 'warning'
          const message = `收现逾期${diffDays}天：${r.item || r.taskName || ''}`
          const key = `${r.item || r.taskName || ''}::ar_overdue`
          const exist = await this.records.findOne({ where: { project: { id: projectId } as any, alertType: 'revenue', alertItem: '应收账款逾期', status: 'active', dedupKey: key } as any })
          if (exist) {
            exist.severity = severity
            exist.message = message
            exist.relatedData = { item: r.item, taskName: r.taskName, revenueConfirmedDate: r.revenueConfirmedDate, overdueDays: diffDays }
            await this.records.save(exist)
          } else {
            const rec = this.records.create({
              project,
              alertType: 'revenue',
              alertItem: '应收账款逾期',
              severity,
              message,
              dedupKey: key,
              relatedData: { item: r.item, taskName: r.taskName, revenueConfirmedDate: r.revenueConfirmedDate, overdueDays: diffDays },
              status: 'active',
              createdAt: new Date().toISOString().slice(0, 19)
            })
            created.push(rec)
          }
        }
      }
    }

    if (created.length) await this.records.save(created)
    return { ok: true, created: created.length }
  }
}