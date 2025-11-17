import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm'
import { Project } from '../../projects/entities/project.entity'

@Entity('project_goals')
export class ProjectGoal {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Project, p => (p as any).goals, { onDelete: 'CASCADE' })
  project: Project

  @Column()
  dimension: 'progress' | 'cost' | 'revenue'

  @Column()
  indicatorKey: string

  @Column({ default: '>=' })
  comparator: string

  @Column({ type: 'numeric' })
  targetValue: number

  @Column({ nullable: true })
  unit: string

  @Column({ nullable: true })
  wellNumber: string

  @Column({ nullable: true })
  taskName: string
}