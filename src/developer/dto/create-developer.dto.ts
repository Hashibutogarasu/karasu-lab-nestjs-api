// OAuth 2.0 クライアント作成用DTO（開発者向け）
export class CreateDeveloperClientDto {
  client_name: string;
  redirect_uri: string;
  grant_types?: string[];
  scope?: string;
}

export class CreateDeveloperDto extends CreateDeveloperClientDto {}
