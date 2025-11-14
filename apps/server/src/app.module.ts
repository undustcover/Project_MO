import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { typeormConfig } from './config/typeorm.config'
import { ProjectsModule } from './projects/projects.module'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: () => typeormConfig }),
    ProjectsModule
  ]
})
export class AppModule {}
