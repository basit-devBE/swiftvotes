import { User } from "../../../users/domain/user";
import { AccessTokenPayload } from "../../domain/access-token-payload";
import { RefreshTokenPayload } from "../../domain/refresh-token-payload";

export type SignedToken = {
  token: string;
  expiresIn: string;
};

export interface AuthTokenService {
  issueAccessToken(user: User): Promise<SignedToken>;
  issueRefreshToken(user: User): Promise<SignedToken>;
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
}
