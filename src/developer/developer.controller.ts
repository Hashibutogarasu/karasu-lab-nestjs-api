import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { UpdateDeveloperDto } from './dto/update-developer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('developer')
@UseGuards(JwtAuthGuard)
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  @Post()
  create(@Body() createDeveloperDto: CreateDeveloperDto, @Request() req: any) {
    return this.developerService.create(createDeveloperDto, req.user.id);
  }

  @Get()
  findAll() {
    return this.developerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.developerService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDeveloperDto: UpdateDeveloperDto,
  ) {
    return this.developerService.update(id, updateDeveloperDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.developerService.remove(id);
  }
}
