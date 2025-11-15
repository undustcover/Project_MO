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
}