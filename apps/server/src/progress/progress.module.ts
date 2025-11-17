import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProgressEvent } from './entities/progress-event.entity'
import { ProgressService } from './progress.service'
import { ProgressController } from './progress.controller'
import { Project } from '../projects/entities/project.entity'
import { ProgressPlan } from './entities/progress-plan.entity'
import { ContractMetric } from './entities/contract-metric.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ProgressEvent, Project, ProgressPlan, ContractMetric])],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService]
})
export class ProgressModule {}