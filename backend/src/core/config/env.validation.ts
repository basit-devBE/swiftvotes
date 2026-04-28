import Joi from "joi";

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  APP_NAME: Joi.string().default("swiftvote-api"),
  APP_VERSION: Joi.string().default("0.1.0"),
  PORT: Joi.number().port().default(3001),
  API_PREFIX: Joi.string().default("api"),
  FRONTEND_ORIGIN: Joi.string().uri().default("http://localhost:3000"),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgres", "postgresql"] })
    .default(
      "postgresql://swiftvote:swiftvote@localhost:5432/swiftvote?schema=public",
    ),
  JWT_ACCESS_SECRET: Joi.string().min(16).default("swiftvote-access-secret"),
  JWT_REFRESH_SECRET: Joi.string()
    .min(16)
    .default("swiftvote-refresh-secret"),
  JWT_ACCESS_TTL: Joi.string().default("15m"),
  JWT_REFRESH_TTL: Joi.string().default("7d"),
  JWT_REFRESH_COOKIE_NAME: Joi.string().default("swiftvote_refresh_token"),
  AWS_S3_BUCKET_NAME: Joi.string().default("swiftvote-assets"),
  AWS_S3_REGION: Joi.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: Joi.string().allow("").default(""),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow("").default(""),
  AWS_S3_PUBLIC_BASE_URL: Joi.string().allow("").default(""),
  AWS_S3_SIGNED_URL_TTL_SECONDS: Joi.number().integer().positive().default(900),
  SUPER_ADMIN_EMAIL: Joi.string().email().optional(),
  SUPER_ADMIN_PASSWORD: Joi.string().min(8).optional(),
  SUPER_ADMIN_FULL_NAME: Joi.string().optional(),
  SMTP_HOST: Joi.string().allow("").default(""),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.string().valid("true", "false").default("false"),
  SMTP_USER: Joi.string().allow("").default(""),
  SMTP_PASS: Joi.string().allow("").default(""),
  EMAIL_FROM: Joi.string().allow("").default("SwiftVote <no-reply@swiftvote.app>"),
});
