import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { typeormConfig } from './config/typeorm.config'
import { ProjectsModule } from './projects/projects.module'
import { ProgressModule } from './progress/progress.module'
import { CostModule } from './cost/cost.module'
import { RevenueModule } from './revenue/revenue.module'
import { AlertsModule } from './alerts/alerts.module'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: () => typeormConfig }),
    ProjectsModule,
    ProgressModule,
    CostModule,
    RevenueModule,
    AlertsModule
  ]
})
export class AppModule {}