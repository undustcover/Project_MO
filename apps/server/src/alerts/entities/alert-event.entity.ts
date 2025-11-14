import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Project } from '../../projects/entities/project.entity'

@Entity('alert_event')
export class AlertEvent {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Project, p => p.id, { nullable: false })
  project: Project

  @Column({ length: 100 })
  name: string

  @Column({ length: 20 })
  level: string

  @Column({ length: 10 })
  date: string

  @Column({ length: 200 })
  detail: string
}