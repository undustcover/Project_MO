import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm'
import { Project } from '../../projects/entities/project.entity'

@Entity('progress_events')
export class ProgressEvent {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project

  @Column({ nullable: true })
  wellNumber: string

  @Column()
  conditionName: string

  @Column()
  level1: string

  @Column({ nullable: true })
  level2: string

  @Column({ nullable: true })
  level3: string

  @Column({ type: 'date', nullable: true })
  date: string

  @Column({ type: 'numeric' })
  hours: number
}