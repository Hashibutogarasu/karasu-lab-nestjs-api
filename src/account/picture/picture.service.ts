import { Injectable } from '@nestjs/common';
import { R2Service } from '../../cloudflare/r2/r2.service';
import { AppErrorCodes } from '../../types/error-codes';

@Injectable()
export class AccountPictureService {
  constructor(private readonly r2Service: R2Service) { }

  async uploadProfilePicture(
    userId: string,
    imageBuffer: Buffer,
  ): Promise<string> {
    const key = `docs/${userId}/profile-picture.png`;
    await this.r2Service.putObject(key, imageBuffer);
    return key;
  }

  async getProfilePictureUrl(userId: string): Promise<string> {
    const key = `docs/${userId}/profile-picture.png`;
    return this.r2Service.getObjectUrl(key);
  }

  async deleteProfilePicture(userId: string): Promise<void> {
    const existingUrl = await this.getProfilePictureUrl(userId);

    if (!existingUrl) {
      throw AppErrorCodes.PROFILE_PICTURE_NOT_FOUND;
    }

    const key = `docs/${userId}/profile-picture.png`;
    await this.r2Service.deleteObject(key);
  }
}
