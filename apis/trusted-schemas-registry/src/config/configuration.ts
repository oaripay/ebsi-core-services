import { ConfigModule } from "@nestjs/config";
import Joi from "joi";

// List here all the values that will be returned by the config factory
export interface ApiConfig {
  apiPort: number;
  apiUrlPrefix: string;
  besuReadinessEndpoint: string;
  // Ledger & SC
  besuRpcNode: string;
  contractAddr: string;
  dockerContainerTag: string;
  domain: string;
  localOrigin: string | undefined;
  logLevel: "debug" | "error" | "info" | "silent" | "verbose" | "warn";
  requestTimeout: number;
  // Test variables
  testSpecificNodeDomain: string | undefined;
  testVaSchemaUrl: string;
}

export const SERVICE_PREFIX = "trusted-schemas-registry";
export const SERVICE_VERSION = "v2";

// EBSI Services that must be up and running before this service starts
export const BOOTSTRAP_DEPENDENCIES = {} as const;

// EBSI Services that must be up and running for this service to be considered healthy
export const RUNTIME_DEPENDENCIES = {} as const;

// EBSI Services that are only used during the tests
export const DEV_DEPENDENCIES = {} as const;

// Config factory
// Note that process.env — for which provide typings in src/environment.d.ts —
// should have already been validated by Joi in src/app.module.ts
export const loadConfig = () => {
  const { DOMAIN } = process.env;

  return {
    apiPort: Number.parseInt(process.env.API_PORT ?? "3000", 10),
    apiUrlPrefix: `/${SERVICE_PREFIX}/${SERVICE_VERSION}`,
    besuReadinessEndpoint: process.env.BESU_READINESS_ENDPOINT,
    // Ledger & SC
    besuRpcNode: process.env.BESU_RPC_NODE,
    contractAddr: process.env.CONTRACT_ADDR,
    dockerContainerTag: process.env.DOCKER_TAG ?? "",
    domain: DOMAIN,
    localOrigin: process.env.LOCAL_ORIGIN,
    logLevel: process.env.LOG_LEVEL ?? "warn",
    requestTimeout: Number.parseInt(process.env.REQUEST_TIMEOUT ?? "15000", 10),
    testSpecificNodeDomain: process.env.TEST_SPECIFIC_NODE_DOMAIN,
    // Test vars
    testVaSchemaUrl: `${DOMAIN}/${SERVICE_PREFIX}/${SERVICE_VERSION}/schemas/${process.env.TEST_VA_SCHEMA}`,
  } as const satisfies ApiConfig;
};

export const ApiConfigModule = ConfigModule.forRoot({
  envFilePath: [
    `.env.${process.env.NODE_ENV}.local`,
    `.env.${process.env.NODE_ENV}`,
    ".env.default.local",
    ".env.default",
  ],
  load: [loadConfig],
  validationSchema: Joi.object<typeof process.env, true>({
    API_PORT: Joi.string().default("3000"),
    BESU_READINESS_ENDPOINT: Joi.string().uri().required(),
    // Ledger & SC
    BESU_RPC_NODE: Joi.string().uri().required(),
    CONTRACT_ADDR: Joi.string().required(),
    DOCKER_TAG: Joi.string(),
    DOMAIN: Joi.string().uri().required(),
    LOCAL_ORIGIN: Joi.string().uri(),
    LOG_LEVEL: Joi.string().valid(
      "silent",
      "error",
      "warn",
      "info",
      "verbose",
      "debug",
    ),
    NETWORK: Joi.string(),
    // Common API variables
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    REQUEST_TIMEOUT: Joi.string(),
    TEST_ENV: Joi.string(),
    TEST_SPECIFIC_NODE_DOMAIN: Joi.string().uri(),
    // Test vars
    TEST_VA_SCHEMA: Joi.string(),
    // Generic variables
    TZ: Joi.string(),
  }),
});
