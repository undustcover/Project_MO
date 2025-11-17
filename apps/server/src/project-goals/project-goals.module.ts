import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectGoal } from './entities/project-goal.entity'
import { Project } from '../projects/entities/project.entity'
import { ProjectGoalsService } from './project-goals.service'
import { ProjectGoalsController } from './project-goals.controller'
import { ProgressModule } from '../progress/progress.module'
import { CostModule } from '../cost/cost.module'
import { RevenueModule } from '../revenue/revenue.module'

@Module({
  imports: [TypeOrmModule.forFeature([ProjectGoal, Project]), ProgressModule, CostModule, RevenueModule],
  controllers: [ProjectGoalsController],
  providers: [ProjectGoalsService],
  exports: [ProjectGoalsService]
})
export class ProjectGoalsModule {}