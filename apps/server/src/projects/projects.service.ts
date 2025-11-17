import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Project } from './entities/project.entity'
import { Participant } from './entities/participant.entity'
import { Subcontractor } from './entities/subcontractor.entity'
import { CreateProjectDto } from './dto/create-project.dto'
import { UpdateProjectDto } from './dto/update-project.dto'

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private projectsRepo: Repository<Project>,
    @InjectRepository(Participant) private participantsRepo: Repository<Participant>,
    @InjectRepository(Subcontractor) private subcontractorsRepo: Repository<Subcontractor>
  ) {}

  async create(dto: CreateProjectDto) {
    const project = this.projectsRepo.create({
      name: dto.name,
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

  async update(id: number, dto: UpdateProjectDto) {
    const project = await this.projectsRepo.findOne({ where: { id }, relations: ['participants', 'subcontractors'] })
    if (!project) return null
    if (dto.name !== undefined) project.name = dto.name
    if (dto.contractNo !== undefined) project.contractNo = dto.contractNo
    if (dto.contractStart !== undefined) project.contractStart = dto.contractStart
    if (dto.contractEnd !== undefined) project.contractEnd = dto.contractEnd
    if (dto.workloadText !== undefined) project.workloadText = dto.workloadText
    if (dto.amountValue !== undefined) project.amountValue = dto.amountValue as any
    if (dto.amountCurrency !== undefined) project.amountCurrency = dto.amountCurrency
    if (dto.startDate !== undefined) project.startDate = dto.startDate
    if (dto.acceptanceDate !== undefined) project.acceptanceDate = dto.acceptanceDate
    if (dto.finalPaymentDate !== undefined) project.finalPaymentDate = dto.finalPaymentDate
    if (dto.bondReleaseDate !== undefined) project.bondReleaseDate = dto.bondReleaseDate
    if (dto.reviewDate !== undefined) project.reviewDate = dto.reviewDate
    if (dto.participants !== undefined) {
      await this.participantsRepo.createQueryBuilder().delete().where('projectId = :id', { id }).execute()
      project.participants = (dto.participants || []).map(kv => this.participantsRepo.create(kv))
    }
    if (dto.subcontractors !== undefined) {
      await this.subcontractorsRepo.createQueryBuilder().delete().where('projectId = :id', { id }).execute()
      project.subcontractors = (dto.subcontractors || []).map(kv => this.subcontractorsRepo.create(kv))
    }
    return await this.projectsRepo.save(project)
  }

  async remove(id: number) {
    await this.projectsRepo.delete(id)
    return { success: true }
  }

  async getHomeConfig(id: number) {
    const p = await this.projectsRepo.findOne({ where: { id } })
    return p?.homeConfig || null
  }

  async setHomeConfig(id: number, cfg: any) {
    const p = await this.projectsRepo.findOne({ where: { id } })
    if (!p) return { ok: false, error: 'Project not found' }
    p.homeConfig = cfg || null
    await this.projectsRepo.save(p)
    return { ok: true }
  }
}