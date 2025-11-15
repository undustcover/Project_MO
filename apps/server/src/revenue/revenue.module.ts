import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RevenueEvent } from './entities/revenue-event.entity'
import { RevenueService } from './revenue.service'
import { RevenueController } from './revenue.controller'
import { Project } from '../projects/entities/project.entity'
import { ProgressPlan } from '../progress/entities/progress-plan.entity'
import { CostEvent } from '../cost/entities/cost-event.entity'
import { ProgressEvent } from '../progress/entities/progress-event.entity'

@Module({
  imports: [TypeOrmModule.forFeature([RevenueEvent, Project, ProgressPlan, ProgressEvent, CostEvent])],
  controllers: [RevenueController],
  providers: [RevenueService],
  exports: [RevenueService]
})
export class RevenueModule {}