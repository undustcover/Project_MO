import { Controller, Get, Post, Delete, Query, Body, Patch, Param } from '@nestjs/common'
import { AlertsService } from './alerts.service'
import { AlertsScheduler } from './alerts.scheduler'

@Controller('dashboard/alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService, private readonly scheduler: AlertsScheduler) {}

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

  @Get('records')
  listRecords(@Query('projectId') projectId: string, @Query('status') status?: string, @Query('type') type?: string, @Query('severity') severity?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.listRecords(Number(projectId), status, type, severity, from, to)
  }

  @Post('check')
  check(@Query('projectId') projectId: string) { return this.service.check(Number(projectId)) }

  @Patch('records/:id/status')
  setStatus(@Param('id') id: string, @Body() body: { status: 'resolved' | 'ignored'; note?: string }) {
    return this.service.setRecordStatus(Number(id), body.status, body.note)
  }

  @Delete('records/:id')
  removeRecord(@Param('id') id: string) { return this.service.deleteRecord(Number(id)) }

  @Get('configs')
  listConfigs(@Query('projectId') projectId?: string) { return this.service.listConfigs(projectId ? Number(projectId) : undefined) }

  @Post('configs')
  saveConfigs(@Query('projectId') projectId?: string, @Body() body: Array<{ alertType: string; alertItem: string; thresholdType: string; warningThreshold: number; criticalThreshold: number; isActive?: boolean }>) {
    return this.service.saveConfigs(projectId ? Number(projectId) : null, body)
  }

  @Post('configs/item')
  createConfig(@Query('projectId') projectId?: string, @Body() body: { alertType: string; alertItem: string; thresholdType: string; warningThreshold: number; criticalThreshold: number; isActive?: boolean; scopeType?: string; scopeValue?: string; requiresPlan?: boolean }) {
    return this.service.createConfig(projectId ? Number(projectId) : null, body)
  }

  @Patch('configs/:id')
  updateConfig(@Param('id') id: string, @Body() body: Partial<{ alertType: string; alertItem: string; thresholdType: string; warningThreshold: number; criticalThreshold: number; isActive: boolean; scopeType?: string; scopeValue?: string; requiresPlan?: boolean }>) {
    return this.service.updateConfig(Number(id), body)
  }

  @Delete('configs/:id')
  deleteConfig(@Param('id') id: string) { return this.service.deleteConfig(Number(id)) }

  @Post('configs/generate-from-plan')
  generateFromPlan(@Query('projectId') projectId: string) { return this.service.generateFromPlan(Number(projectId)) }
  @Post('scheduler/interval')
  setSchedulerInterval(@Body() body: { minutes: number }) { return this.scheduler.setIntervalMinutes(Number(body.minutes)) }
  @Get('scheduler/interval')
  getSchedulerInterval() { return this.scheduler.getIntervalMinutes() }
}