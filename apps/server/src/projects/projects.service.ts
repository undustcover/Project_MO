import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Project } from './entities/project.entity'
import { Participant } from './entities/participant.entity'
import { Subcontractor } from './entities/subcontractor.entity'
import { CreateProjectDto } from './dto/create-project.dto'

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private projectsRepo: Repository<Project>,
    @InjectRepository(Participant) private participantsRepo: Repository<Participant>,
    @InjectRepository(Subcontractor) private subcontractorsRepo: Repository<Subcontractor>
  ) {}

  async create(dto: CreateProjectDto) {
    const project = this.projectsRepo.create({
      contractNo: dto.contractNo,
      contractStart: dto.contractStart,
      contractEnd: dto.contractEnd,
      workloadText: dto.workloadText,
      amountValue: dto.amountValue,
      amountCurrency: dto.amountCurrency,
      startDate: dto.startDate,
      acceptanceDate: dto.acceptanceDate,
      finalPaymentDate: dto.finalPaymentDate,
      bondReleaseDate: dto.bondReleaseDate,
      reviewDate: dto.reviewDate
    })
    project.participants = (dto.participants || []).map(kv => this.participantsRepo.create(kv))
    project.subcontractors = (dto.subcontractors || []).map(kv => this.subcontractorsRepo.create(kv))
    return await this.projectsRepo.save(project)
  }

  async findAll() {
    return this.projectsRepo.find({ relations: ['participants', 'subcontractors'] })
  }

  async findOne(id: number) {
    return this.projectsRepo.findOne({ where: { id }, relations: ['participants', 'subcontractors'] })
  }
}