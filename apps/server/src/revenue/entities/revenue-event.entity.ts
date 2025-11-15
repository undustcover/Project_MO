import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Project } from '../../projects/entities/project.entity'

@Entity('revenue_event')
export class RevenueEvent {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Project, p => p.id, { nullable: false })
  project: Project

  @Column({ length: 100 })
  source: string

  @Column({ length: 100 })
  item: string

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number

  @Column({ length: 10 })
  date: string

  @Column({ length: 200, nullable: true })
  remark?: string

  @Column({ length: 50, nullable: true })
  wellNo?: string

  @Column({ length: 4, nullable: true })
  year?: string

  @Column({ length: 200, nullable: true })
  taskName?: string

  @Column({ length: 200, nullable: true })
  wbs?: string

  @Column({ length: 10, nullable: true })
  plannedStart?: string

  @Column({ length: 10, nullable: true })
  plannedEnd?: string

  @Column({ length: 10, nullable: true })
  actualStart?: string

  @Column({ length: 10, nullable: true })
  actualEnd?: string

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  actualWorkload?: number

  @Column({ length: 50, nullable: true })
  unit?: string

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  unitPriceUSD?: number

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  additionalFeeUSD?: number

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  totalWorkValueUSD?: number

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  revenuePlanUSD?: number

  @Column({ length: 10, nullable: true })
  revenueConfirmedDate?: string

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  revenueConfirmedAmountUSD?: number

  @Column({ length: 10, nullable: true })
  cashDate?: string

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  cashAmountUSD?: number
}