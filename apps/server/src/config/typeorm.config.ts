import { DataSourceOptions } from 'typeorm'
const usePostgres = process.env.PG_HOST || process.env.DATABASE_URL
export const typeormConfig: DataSourceOptions = usePostgres
  ? {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      host: process.env.PG_HOST,
      port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
      username: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DB,
      entities: [__dirname + '/../**/*.entity.{ts,js}'],
      synchronize: true
    }
  : {
      type: 'sqljs',
      location: __dirname + '/../../data/dev.sqlite',
      autoSave: true,
      entities: [__dirname + '/../**/*.entity.{ts,js}'],
      synchronize: true
    }