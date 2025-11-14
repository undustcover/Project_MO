import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProjectsController } from './projects.controller'
import { ProjectsService } from './projects.service'
import { Project } from './entities/project.entity'
import { Participant } from './entities/participant.entity'
import { Subcontractor } from './entities/subcontractor.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Project, Participant, Subcontractor])],
  controllers: [ProjectsController],
  providers: [ProjectsService]
})
export class ProjectsModule {}