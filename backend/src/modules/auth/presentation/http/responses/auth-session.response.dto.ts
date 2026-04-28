import { User } from "../../../../users/domain/user";
import { UserResponseDto } from "../../../../users/presentation/http/responses/user-response.dto";

export class AuthSessionResponseDto {
  accessToken!: string;
  accessTokenExpiresIn!: string;
  user!: UserResponseDto;

  static fromResult(input: {
    accessToken: string;
    accessTokenExpiresIn: string;
    user: User;
  }): AuthSessionResponseDto {
    return {
      accessToken: input.accessToken,
      accessTokenExpiresIn: input.accessTokenExpiresIn,
      user: UserResponseDto.fromDomain(input.user),
    };
  }
}
