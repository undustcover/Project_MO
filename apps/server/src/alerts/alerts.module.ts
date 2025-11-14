import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AlertsService } from './alerts.service'
import { AlertsController } from './alerts.controller'
import { AlertRule } from './entities/alert-rule.entity'
import { AlertEvent } from './entities/alert-event.entity'
import { Project } from '../projects/entities/project.entity'

@Module({
  imports: [TypeOrmModule.forFeature([AlertRule, AlertEvent, Project])],
  controllers: [AlertsController],
  providers: [AlertsService]
})
export class AlertsModule {}