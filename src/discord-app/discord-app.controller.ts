import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DiscordAppService } from './discord-app.service';
import { CreateDiscordAppDto } from './dto/create-discord-app.dto';
import { UpdateDiscordAppDto } from './dto/update-discord-app.dto';

@Controller('discord-app')
export class DiscordAppController {
  constructor(private readonly discordAppService: DiscordAppService) {}
}
