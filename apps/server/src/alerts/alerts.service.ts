import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AlertRule } from './entities/alert-rule.entity'
import { AlertEvent } from './entities/alert-event.entity'
import { Project } from '../projects/entities/project.entity'

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertRule) private rules: Repository<AlertRule>,
    @InjectRepository(AlertEvent) private events: Repository<AlertEvent>,
    @InjectRepository(Project) private projects: Repository<Project>
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
    } else {
      await this.rules.createQueryBuilder().delete().execute()
      await this.events.createQueryBuilder().delete().execute()
    }
    return { ok: true }
  }
}