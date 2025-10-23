import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import {
  DiscordTokenResponseSchema,
  DiscordRevokeResponseSchema,
  DiscordTokenResponse,
  DiscordRevokeResponse,
} from '../../types/discord-token';
import { AppConfigService } from '../../app-config/app-config.service';

@Injectable()
export class DiscordTokenService {
  private tokenUrl = 'https://discord.com/api/oauth2/token';
  private revokeUrl = 'https://discord.com/api/oauth2/token/revoke';

  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(readonly configService: AppConfigService) {
    this.clientId = configService.get('discordClientId')!;
    this.clientSecret = configService.get('discordClientSecret')!;
    this.redirectUri = configService.get('discordRedirectUri')!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Discord client credentials are not configured');
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCode(code: string): Promise<DiscordTokenResponse> {
    if (!code) throw new BadRequestException('authorization code is required');

    const body = new URLSearchParams();
    body.append('client_id', this.clientId);
    body.append('client_secret', this.clientSecret);
    body.append('grant_type', 'authorization_code');
    body.append('code', code);
    body.append('redirect_uri', this.redirectUri);

    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new InternalServerErrorException(
        `Discord token endpoint error: ${JSON.stringify(json)}`,
      );
    }

    const parsed = DiscordTokenResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new InternalServerErrorException(
        'Invalid token response from Discord',
      );
    }

    return parsed.data;
  }

  /**
   * Revoke a token (access or refresh)
   */
  async revokeToken(token: string): Promise<DiscordRevokeResponse> {
    if (!token) throw new BadRequestException('token is required');

    const body = new URLSearchParams();
    body.append('client_id', this.clientId);
    body.append('client_secret', this.clientSecret);
    body.append('token', token);

    const res = await fetch(this.revokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    // Discord returns 200 with empty body on success; some libs return { success: true }
    if (res.status === 200) {
      // try parse body, but allow empty
      let json: any = {};
      try {
        json = await res.json();
      } catch (e) {
        json = { success: true };
      }

      const parsed = DiscordRevokeResponseSchema.safeParse(json);
      if (!parsed.success) {
        // return generic success when body missing
        return { success: true } as DiscordRevokeResponse;
      }

      return parsed.data;
    }

    const text = await res.text();
    throw new InternalServerErrorException(
      `Discord revoke endpoint error: ${res.status} ${text}`,
    );
  }
}
