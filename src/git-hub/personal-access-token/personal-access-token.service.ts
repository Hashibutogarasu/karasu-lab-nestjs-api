import { Injectable } from '@nestjs/common';
import {
  GithubPATUserResponse,
  githubUserSchema,
} from './personal-access-token.schema';

@Injectable()
export class PersonalAccessTokenService {
  private readonly baseUrl = 'https://api.github.com/';

  async fetchGithub(
    path: string,
    headers: Record<string, any> = {},
  ): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      headers,
    });
  }

  async authorize(accessToken: string): Promise<GithubPATUserResponse> {
    const res = await this.fetchGithub('user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const raw = await res.json();

    return githubUserSchema.parse(raw);
  }
}
