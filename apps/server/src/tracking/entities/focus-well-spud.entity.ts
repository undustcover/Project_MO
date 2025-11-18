import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Project } from '../../projects/entities/project.entity'
import { FocusProject } from './focus-project.entity'

@Entity('focus_well_spud')
export class FocusWellSpud {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Project, p => p.id, { nullable: false })
  project: Project

  @ManyToOne(() => FocusProject, f => f.id, { nullable: true })
  focus?: FocusProject

  @Column({ length: 200 })
  projectName: string

  @Column({ length: 50 })
  wellNo: string

  @Column({ length: 10, nullable: true })
  estimatedSpudDate?: string

  @Column({ length: 19, nullable: true })
  firstWellSpudTime?: string
}