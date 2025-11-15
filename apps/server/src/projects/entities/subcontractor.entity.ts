import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm'
import { Project } from './project.entity'

@Entity('project_subcontractors')
export class Subcontractor {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  key: string

  @Column()
  value: string

  @ManyToOne(() => Project, project => project.subcontractors, { onDelete: 'CASCADE' })
  project: Project
}