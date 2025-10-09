import { PartialType } from '@nestjs/mapped-types';

export class CreateJwtStateDto {
  id: string;
  userId: string;
  revoked: boolean;
}

export class UpdateJwtStateDto extends PartialType(CreateJwtStateDto) {}
