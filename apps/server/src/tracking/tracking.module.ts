import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TrackingRecord } from './entities/tracking-record.entity'
import { FocusProject } from './entities/focus-project.entity'
import { FocusWellSpud } from './entities/focus-well-spud.entity'
import { TrackingService } from './tracking.service'
import { TrackingController } from './tracking.controller'
import { Project } from '../projects/entities/project.entity'

@Module({
  imports: [TypeOrmModule.forFeature([TrackingRecord, FocusProject, FocusWellSpud, Project])],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService]
})
export class TrackingModule {}