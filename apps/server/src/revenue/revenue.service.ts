import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RevenueEvent } from './entities/revenue-event.entity'
import { Project } from '../projects/entities/project.entity'

@Injectable()
export class RevenueService {
  constructor(
    @InjectRepository(RevenueEvent) private repo: Repository<RevenueEvent>,
    @InjectRepository(Project) private projects: Repository<Project>
  ) {}

  async summary(projectId: number, from?: string, to?: string) {
    const qb = this.repo.createQueryBuilder('e').leftJoin('e.project', 'p').where('p.id = :id', { id: projectId })
    if (from) qb.andWhere('e.date >= :from', { from })
    if (to) qb.andWhere('e.date <= :to', { to })
    const rows = await qb.getMany()
    const total = rows.reduce((s, r) => s + Number(r.amount), 0)
    const bySrc = new Map<string, number>()
    for (const r of rows) bySrc.set(r.source, (bySrc.get(r.source) || 0) + Number(r.amount))
    const categories = Array.from(bySrc.keys())
    const values = categories.map(c => bySrc.get(c) || 0)
    return { total, chart: { categories, values }, rows }
  }

  async import(projectId: number, items: Array<{ source: string; item: string; amount: number; date: string; remark?: string }>) {
    const project = await this.projects.findOne({ where: { id: projectId } })
    if (!project) return { ok: false, error: '项目不存在' }
    const out = items.filter(i => i.source && i.item && i.amount != null && i.date).map(i => this.repo.create({ project, ...i }))
    if (out.length) await this.repo.save(out)
    return { ok: true, count: out.length }
  }

  async clear(projectId?: number) {
    if (projectId) await this.repo.createQueryBuilder().delete().where('projectId = :pid', { pid: projectId }).execute()
    else await this.repo.createQueryBuilder().delete().execute()
    return { ok: true }
  }
}