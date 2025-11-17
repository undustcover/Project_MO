import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Project } from '../../projects/entities/project.entity'

@Entity('alert_config')
export class AlertConfig {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Project, p => p.id, { nullable: true })
  project: Project | null

  @Column({ length: 50 })
  alertType: string

  @Column({ length: 100 })
  alertItem: string

  @Column({ length: 20 })
  thresholdType: string

  @Column('int')
  warningThreshold: number

  @Column('int')
  criticalThreshold: number

  @Column({ default: true })
  isActive: boolean

  @Column({ length: 30, nullable: true })
  scopeType?: string

  @Column({ length: 100, nullable: true })
  scopeValue?: string

  @Column({ default: false })
  requiresPlan: boolean

  @Column({ length: 20, nullable: true })
  planStatus?: string

  @Column({ length: 20 })
  createdAt: string

  @Column({ length: 20 })
  updatedAt: string
}