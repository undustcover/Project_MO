import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Project } from '../../projects/entities/project.entity'

@Entity('cost_event')
export class CostEvent {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Project, p => p.id, { nullable: false })
  project: Project

  @Column({ length: 200 })
  taskName: string

  @Column({ length: 100 })
  groupLevel1: string

  @Column({ length: 100 })
  groupLevel2: string

  @Column({ length: 200 })
  groupLevel3: string

  @Column({ length: 200, nullable: true })
  groupLevel4?: string

  @Column({ length: 50, nullable: true })
  unit?: string

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  unitPrice?: number

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  quantity?: number

  @Column('decimal', { precision: 14, scale: 2 })
  totalCost: number

  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  revenue?: number
}