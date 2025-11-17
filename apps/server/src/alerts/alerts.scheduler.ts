import { Injectable } from '@nestjs/common'

@Injectable()
export class AlertsScheduler {
  private intervalMinutes = 240

  setIntervalMinutes(minutes: number) {
    if (Number.isFinite(minutes) && minutes > 0 && minutes <= 1440) {
      this.intervalMinutes = Math.round(minutes)
      return { ok: true }
    }
    return { ok: false, error: 'invalid minutes' }
  }

  getIntervalMinutes() {
    return { intervalMinutes: this.intervalMinutes }
  }
}