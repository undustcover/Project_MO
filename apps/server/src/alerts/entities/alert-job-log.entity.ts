import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('alert_job_log')
export class AlertJobLog {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 50 })
  jobName: string

  @Column({ length: 20 })
  status: string

  @Column({ length: 20 })
  startedAt: string

  @Column({ length: 20, nullable: true })
  finishedAt?: string

  @Column({ length: 200, nullable: true })
  message?: string
}