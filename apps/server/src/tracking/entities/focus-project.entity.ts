import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm'
import { Project } from '../../projects/entities/project.entity'

@Entity('tracking_focus')
@Unique(['project', 'contractNo'])
export class FocusProject {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Project, p => p.id, { nullable: false })
  project: Project

  @Column({ length: 100 })
  contractNo: string

  @Column({ length: 200, nullable: true })
  projectName?: string

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  workloadCount?: number

  @Column({ length: 200, nullable: true })
  realtimeProgress?: string

  @Column({ length: 16, nullable: true })
  firstWellSpudTime?: string

  @Column({ length: 500, nullable: true })
  focusItems?: string

  @Column({ length: 200, nullable: true })
  workValueDone?: string

  @Column({ length: 200, nullable: true })
  expectedWorkThisYear?: string
}