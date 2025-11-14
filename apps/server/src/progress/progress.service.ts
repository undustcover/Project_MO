import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProgressEvent } from './entities/progress-event.entity'

@Injectable()
export class ProgressService {
  constructor(@InjectRepository(ProgressEvent) private repo: Repository<ProgressEvent>) {}

  async dashboard(projectId: number, taskName?: string, from?: string, to?: string) {
    const qb = this.repo.createQueryBuilder('e').leftJoin('e.project', 'p').where('p.id = :id', { id: projectId })
    if (taskName) qb.andWhere('e.conditionName = :task', { task: taskName })
    if (from) qb.andWhere('e.date >= :from', { from })
    if (to) qb.andWhere('e.date <= :to', { to })
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
      footageWorkingTime
    }
  }

  async tasks(projectId: number) {
    const rows = await this.repo
      .createQueryBuilder('e')
      .leftJoin('e.project', 'p')
      .where('p.id = :id', { id: projectId })
      .select('DISTINCT e.conditionName', 'name')
      .getRawMany()
    return rows.map(r => r.name).filter(Boolean)
  }

  async taskDetail(projectId: number, taskName: string, from?: string, to?: string) {
    const qb = this.repo.createQueryBuilder('e').leftJoin('e.project', 'p').where('p.id = :id', { id: projectId }).andWhere('e.conditionName = :task', { task: taskName })
    if (from) qb.andWhere('e.date >= :from', { from })
    if (to) qb.andWhere('e.date <= :to', { to })
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

  async taskBreakdown(projectId: number, taskName: string, from?: string, to?: string) {
    const qb = this.repo.createQueryBuilder('e').leftJoin('e.project', 'p').where('p.id = :id', { id: projectId }).andWhere('e.conditionName = :task', { task: taskName })
    if (from) qb.andWhere('e.date >= :from', { from })
    if (to) qb.andWhere('e.date <= :to', { to })
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
}