import { PartialType } from '@nestjs/mapped-types';

export class CreateJwtStateDto {
  id?: string;
  userId: string;
  revoked?: boolean;
  tokenHint?: string;
}

export class UpdateJwtStateDto extends PartialType(CreateJwtStateDto) {}
