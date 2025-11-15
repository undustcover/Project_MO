import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm'
import { Project } from './project.entity'

@Entity('project_participants')
export class Participant {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  key: string

  @Column()
  value: string

  @ManyToOne(() => Project, project => project.participants, { onDelete: 'CASCADE' })
  project: Project
}