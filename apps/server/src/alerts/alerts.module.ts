import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AlertsService } from './alerts.service'
import { AlertsController } from './alerts.controller'
import { AlertRule } from './entities/alert-rule.entity'
import { AlertEvent } from './entities/alert-event.entity'
import { Project } from '../projects/entities/project.entity'
import { AlertRecord } from './entities/alert-record.entity'
import { AlertConfig } from './entities/alert-config.entity'
import { AlertJobLog } from './entities/alert-job-log.entity'
import { ProgressModule } from '../progress/progress.module'
import { CostModule } from '../cost/cost.module'
import { RevenueModule } from '../revenue/revenue.module'
import { AlertsScheduler } from './alerts.scheduler'

@Module({
  imports: [TypeOrmModule.forFeature([AlertRule, AlertEvent, AlertRecord, AlertConfig, AlertJobLog, Project]), ProgressModule, CostModule, RevenueModule],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsScheduler]
})
export class AlertsModule {}