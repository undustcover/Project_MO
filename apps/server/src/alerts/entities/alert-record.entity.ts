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

  @Column({ length: 200, nullable: true })
  dedupKey?: string

  @Column('simple-json', { nullable: true })
  relatedData?: any

  @Column({ length: 20, default: 'active' })
  status: string

  @Column({ length: 20 })
  createdAt: string

  @Column({ length: 20, nullable: true })
  resolvedAt?: string

  @Column({ length: 200, nullable: true })
  resolutionNote?: string
}