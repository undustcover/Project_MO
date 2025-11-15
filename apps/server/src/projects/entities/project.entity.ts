import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'
import { Participant } from './participant.entity'
import { Subcontractor } from './subcontractor.entity'

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  name: string

  @Column()
  contractNo: string

  @Column({ type: 'date', nullable: true })
  contractStart: string

  @Column({ type: 'date', nullable: true })
  contractEnd: string

  @Column({ nullable: true })
  workloadText: string

  @Column({ type: 'numeric', nullable: true })
  amountValue: number

  @Column({ nullable: true })
  amountCurrency: string

  @Column({ type: 'date', nullable: true })
  startDate: string

  @Column({ type: 'date', nullable: true })
  acceptanceDate: string

  @Column({ type: 'date', nullable: true })
  finalPaymentDate: string

  @Column({ type: 'date', nullable: true })
  bondReleaseDate: string

  @Column({ type: 'date', nullable: true })
  reviewDate: string

  @OneToMany(() => Participant, p => p.project, { cascade: true })
  participants: Participant[]

  @OneToMany(() => Subcontractor, s => s.project, { cascade: true })
  subcontractors: Subcontractor[]
}