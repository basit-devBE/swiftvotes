import { ConfigType } from "@nestjs/config";

import { appConfig } from "../../../../core/config/app.config";
import { GetHealthUseCase } from "./get-health.use-case";

describe("GetHealthUseCase", () => {
  it("returns an ok health payload", () => {
    const config = {
      name: "swiftvote-api",
      version: "0.1.0",
      environment: "test",
      port: 3001,
      apiPrefix: "api",
    } satisfies ConfigType<typeof appConfig>;

    const useCase = new GetHealthUseCase(config);
    const result = useCase.execute();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("swiftvote-api");
    expect(result.environment).toBe("test");
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
