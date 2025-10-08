import { PartialType } from '@nestjs/mapped-types';
import { CreateDiscordAppDto } from './create-discord-app.dto';

export class UpdateDiscordAppDto extends PartialType(CreateDiscordAppDto) {}
