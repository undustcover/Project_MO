import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Project } from '../../projects/entities/project.entity'

@Entity('cost_plan')
export class CostPlan {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Project, p => p.id, { nullable: false })
  project: Project

  @Column({ length: 200 })
  taskName: string

  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  projectBudget?: number

  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  taskBudget?: number

  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  budgetLabor?: number

  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  budgetMaterials?: number

  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  budgetEquipment?: number

  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  budgetServices?: number
}