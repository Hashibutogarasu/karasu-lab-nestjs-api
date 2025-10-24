import { Module } from '@nestjs/common';
import { PersonalAccessTokenService } from './personal-access-token/personal-access-token.service';

@Module({
  providers: [PersonalAccessTokenService],
})
export class GitHubModule {}
