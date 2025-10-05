// ユーザー登録用DTO
export class RegisterDto {
  username: string;
  email: string;
  password: string;
}

// ログイン用DTO
export class LoginDto {
  usernameOrEmail: string;
  password: string;
}

// 認証情報作成用DTO
export class CreateAuthDto {
  username: string;
  email: string;
  password: string;
}
