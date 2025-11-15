import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RevenueEvent } from './entities/revenue-event.entity'
import { RevenueService } from './revenue.service'
import { RevenueController } from './revenue.controller'
import { Project } from '../projects/entities/project.entity'

@Module({
  imports: [TypeOrmModule.forFeature([RevenueEvent, Project])],
  controllers: [RevenueController],
  providers: [RevenueService]
})
export class RevenueModule {}