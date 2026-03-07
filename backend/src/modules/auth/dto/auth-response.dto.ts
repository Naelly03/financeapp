export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: {
    id: string;
    name: string;
    email: string;
    plan: string;
  };
}