import Joi from "joi";

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  APP_NAME: Joi.string().default("swiftvote-api"),
  APP_VERSION: Joi.string().default("0.1.0"),
  PORT: Joi.number().port().default(3001),
  API_PREFIX: Joi.string().default("api"),
});
