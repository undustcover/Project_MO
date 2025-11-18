import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Project } from '../../projects/entities/project.entity'

@Entity('tracking_record')
export class TrackingRecord {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Project, p => p.id, { nullable: false })
  project: Project

  @Column({ length: 100, nullable: true })
  marketCountry?: string

  @Column('int', { nullable: true })
  indexNo?: number

  @Column({ length: 100, nullable: true })
  teamNo?: string

  @Column({ length: 100, nullable: true })
  teamNewNo?: string

  @Column({ length: 100, nullable: true })
  rigNo?: string

  @Column({ length: 100, nullable: true })
  rigModel?: string

  @Column({ length: 100, nullable: true })
  manufacturer?: string

  @Column({ length: 10, nullable: true })
  productionDate?: string

  @Column({ length: 100, nullable: true })
  executor?: string

  @Column({ length: 200, nullable: true })
  projectName?: string

  @Column({ length: 200, nullable: true })
  projectNickname?: string

  @Column({ length: 100, nullable: true })
  contractNo?: string

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  contractAmountUSD?: number

  @Column({ length: 10, nullable: true })
  contractStartDate?: string

  @Column({ length: 10, nullable: true })
  contractEndDate?: string

  @Column({ length: 200, nullable: true })
  ownerUnit?: string

  @Column({ length: 50, nullable: true })
  teamStatus?: string

  @Column({ length: 500, nullable: true })
  constructionStatus?: string

  @Column({ length: 500, nullable: true })
  nextMarketPlan?: string

  @Column({ length: 500, nullable: true })
  remark?: string

  @Column({ length: 200, nullable: true })
  contact1?: string

  @Column({ length: 200, nullable: true })
  contact2?: string
}