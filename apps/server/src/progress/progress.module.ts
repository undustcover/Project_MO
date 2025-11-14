import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProgressEvent } from './entities/progress-event.entity'
import { ProgressService } from './progress.service'
import { ProgressController } from './progress.controller'
import { Project } from '../projects/entities/project.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ProgressEvent, Project])],
  controllers: [ProgressController],
  providers: [ProgressService]
})
export class ProgressModule {}