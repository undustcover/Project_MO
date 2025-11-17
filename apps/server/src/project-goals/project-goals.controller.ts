import { Body, Controller, Delete, Get, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common'
import { ProjectGoalsService } from './project-goals.service'
import { CreateProjectGoalDto } from './dto/create-project-goal.dto'

@Controller('projects/:projectId/goals')
export class ProjectGoalsController {
  constructor(private readonly service: ProjectGoalsService) {}

  @Get()
  async list(@Param('projectId') projectId: string) {
    return this.service.list(Number(projectId))
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async setAll(@Param('projectId') projectId: string, @Body() goals: CreateProjectGoalDto[]) {
    return this.service.setAll(Number(projectId), goals)
  }

  @Delete(':id')
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.service.remove(Number(projectId), Number(id))
  }

  @Get('evaluate')
  async evaluate(@Param('projectId') projectId: string) {
    return this.service.evaluateAll(Number(projectId))
  }

  @Get('summary')
  async summary(@Param('projectId') projectId: string) {
    const r = await this.service.evaluateAll(Number(projectId))
    return r.summary
  }
}