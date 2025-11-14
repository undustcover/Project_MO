import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm'
import { Project } from '../../projects/entities/project.entity'

@Entity('contract_metrics')
export class ContractMetric {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project

  @Column()
  wellNumber: string

  @Column({ type: 'numeric', default: 0 })
  productionTime: number

  @Column({ type: 'numeric', default: 0 })
  nonProductionTime: number

  @Column({ type: 'numeric', default: 0 })
  completionTime: number

  @Column({ type: 'numeric', default: 0 })
  movingPeriod: number

  @Column({ type: 'numeric', default: 0 })
  wellCompletionPeriod: number

  @Column({ type: 'numeric', default: 0 })
  drillingPeriod: number
}