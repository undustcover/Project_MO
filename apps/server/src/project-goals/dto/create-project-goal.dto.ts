import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateProjectGoalDto {
  @IsIn(['progress', 'cost', 'revenue'])
  dimension: 'progress' | 'cost' | 'revenue'

  @IsString()
  indicatorKey: string

  @IsOptional()
  @IsString()
  comparator?: string

  @IsNumber()
  targetValue: number

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsString()
  wellNumber?: string

  @IsOptional()
  @IsString()
  taskName?: string
}