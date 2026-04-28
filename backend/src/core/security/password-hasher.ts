import { Injectable } from "@nestjs/common";
import { compare, hash } from "bcryptjs";

export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");

export interface PasswordHasher {
  hash(value: string): Promise<string>;
  compare(plainText: string, hashValue: string): Promise<boolean>;
}

@Injectable()
export class BcryptPasswordHasherService implements PasswordHasher {
  async hash(value: string): Promise<string> {
    return hash(value, 12);
  }

  async compare(plainText: string, hashValue: string): Promise<boolean> {
    return compare(plainText, hashValue);
  }
}
