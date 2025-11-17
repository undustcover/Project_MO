import { IsArray, IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class KVDto {
  @IsString()
  key: string
  @IsString()
  value: string
}

export class CreateProjectDto {
  @IsOptional()
  @IsString()
  name?: string
  @IsString()
  contractNo: string
  @IsOptional()
  @IsDateString()
  contractStart?: string
  @IsOptional()
  @IsDateString()
  contractEnd?: string
  @IsOptional()
  @IsString()
  workloadText?: string
  @IsOptional()
  @IsNumber()
  amountValue?: number
  @IsOptional()
  @IsString()
  amountCurrency?: string
  @IsOptional()
  @IsDateString()
  startDate?: string
  @IsOptional()
  @IsDateString()
  acceptanceDate?: string
  @IsOptional()
  @IsDateString()
  finalPaymentDate?: string
  @IsOptional()
  @IsDateString()
  bondReleaseDate?: string
  @IsOptional()
  @IsDateString()
  reviewDate?: string
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KVDto)
  participants: KVDto[]
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KVDto)
  subcontractors: KVDto[]
}