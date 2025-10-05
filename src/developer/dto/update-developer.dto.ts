import { PartialType } from '@nestjs/mapped-types';
import { CreateDeveloperClientDto } from './create-developer.dto';

export class UpdateDeveloperDto extends PartialType(CreateDeveloperClientDto) {}
