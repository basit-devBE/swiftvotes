import { Controller, Get, StreamableFile } from "@nestjs/common";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { Public } from "../../../auth/presentation/http/decorators/public.decorator";

const LOGO_PATH = path.join(
  __dirname,
  "..",
  "..",
  "infrastructure",
  "email",
  "assets",
  "swiftvote-logo.png",
);

@Controller({
  path: "notifications/assets",
  version: "1",
})
export class NotificationsAssetsController {
  @Public()
  @Get("swiftvote-logo.png")
  async getSwiftVoteLogo(): Promise<StreamableFile> {
    const buffer = await fs.readFile(LOGO_PATH);
    return new StreamableFile(buffer, { type: "image/png" });
  }
}
