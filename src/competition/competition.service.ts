import { Injectable } from '@nestjs/common';
import { CreateCompetitionInput } from './dto/create-competition.input';
import { UpdateCompetitionInput } from './dto/update-competition.input';

@Injectable()
export class CompetitionService {
  create(createCompetitionInput: CreateCompetitionInput) {
    return 'This action adds a new competition';
  }

  findAll() {
    return `This action returns all competition`;
  }

  findOne(id: number) {
    return `This action returns a #${id} competition`;
  }

  update(id: number, updateCompetitionInput: UpdateCompetitionInput) {
    return `This action updates a #${id} competition`;
  }

  remove(id: number) {
    return `This action removes a #${id} competition`;
  }
}
