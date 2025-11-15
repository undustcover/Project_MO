import { Controller, Get, Post, Delete, Query, Body } from '@nestjs/common'
import { AlertsService } from './alerts.service'

@Controller('dashboard/alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  @Get()
  list(@Query('projectId') projectId: string) { return this.service.list(Number(projectId)) }

  @Post('rules')
  addRule(@Query('projectId') projectId: string, @Body() body: { name: string; condition: string; level: string }) {
    return this.service.addRule(Number(projectId), body)
  }

  @Post('events')
  addEvent(@Query('projectId') projectId: string, @Body() body: { name: string; level: string; date: string; detail: string }) {
    return this.service.addEvent(Number(projectId), body)
  }

  @Delete('clear')
  clear(@Query('projectId') projectId?: string) { return this.service.clear(projectId ? Number(projectId) : undefined) }
}