import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CostEvent } from './entities/cost-event.entity'
import { CostPlan } from './entities/cost-plan.entity'
import { RevenueEvent } from '../revenue/entities/revenue-event.entity'
import { CostService } from './cost.service'
import { CostController } from './cost.controller'
import { Project } from '../projects/entities/project.entity'
import { ProgressPlan } from '../progress/entities/progress-plan.entity'
import { ProgressEvent } from '../progress/entities/progress-event.entity'

@Module({
  imports: [TypeOrmModule.forFeature([CostEvent, CostPlan, Project, RevenueEvent, ProgressPlan, ProgressEvent])],
  controllers: [CostController],
  providers: [CostService],
  exports: [CostService]
})
export class CostModule {}