import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Project } from '../../projects/entities/project.entity'

@Entity('progress_plan')
export class ProgressPlan {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Project, p => p.id, { nullable: false })
  project: Project

  @Column({ length: 100 })
  wellNumber: string

  @Column({ length: 200 })
  conditionName: string

  @Column({ length: 10 })
  planStartDate: string

  @Column({ length: 10 })
  planEndDate: string
}