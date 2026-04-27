export type HealthStatus = {
  status: "ok";
  service: string;
  version: string;
  environment: "development" | "production" | "test";
  uptimeSeconds: number;
  timestamp: string;
};
