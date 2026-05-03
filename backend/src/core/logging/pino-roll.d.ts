declare module "pino-roll" {
  import type { Writable } from "node:stream";

  type PinoRollOptions = {
    file: string;
    frequency?: "daily" | "hourly" | number;
    size?: string | number;
    extension?: string;
    mkdir?: boolean;
    dateFormat?: string;
    limit?: { count?: number; removeOtherLogFiles?: boolean };
    symlink?: boolean;
  };

  function pinoRoll(options: PinoRollOptions): Promise<Writable>;
  export default pinoRoll;
}
