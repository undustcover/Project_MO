import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Project } from '../../projects/entities/project.entity'

@Entity('alert_record')
export class AlertRecord {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Project, p => p.id, { nullable: false })
  project: Project

  @Column({ length: 50 })
  alertType: string

  @Column({ length: 100 })
  alertItem: string

  @Column({ length: 20 })
  severity: string

  @Column({ length: 500 })
  message: string

  @Column('simple-json', { nullable: true })
  relatedData?: any

  @Column({ length: 20, default: 'active' })
  status: string

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date

  @Column({ length: 200, nullable: true })
  resolutionNote?: string
}