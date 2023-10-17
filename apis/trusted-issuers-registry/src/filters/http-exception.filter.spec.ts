import { vi, describe, beforeAll, afterAll, it, expect } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  ValidationPipe,
  Logger,
  NotFoundException,
  BadRequestException,
  type ArgumentsHost,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AxiosError } from "axios";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ProblemDetailsError } from "@ebsiint-api/shared";
import { AllExceptionsFilter } from "./http-exception.filter.js";
import type { ApiConfig } from "../config/configuration.js";

const mockGetResponse = vi.fn().mockImplementation(() => ({
  code: vi.fn().mockImplementation((code: number) => ({
    type: vi.fn().mockImplementation((type: string) => ({
      send: vi.fn().mockImplementation((send: unknown) => ({
        code,
        type,
        send,
      })),
    })),
  })),
}));

const mockHttpArgumentsHost = vi.fn().mockImplementation(() => ({
  getResponse: mockGetResponse,
  getRequest: vi.fn(),
  getNext: vi.fn(),
})) as ArgumentsHost["switchToHttp"];

const mockArgumentsHost: ArgumentsHost = {
  switchToHttp: mockHttpArgumentsHost,
  getArgByIndex: vi.fn() as ArgumentsHost["getArgByIndex"],
  getArgs: vi.fn() as ArgumentsHost["getArgs"],
  getType: vi.fn() as ArgumentsHost["getType"],
  switchToRpc: vi.fn() as ArgumentsHost["switchToRpc"],
  switchToWs: vi.fn() as ArgumentsHost["switchToWs"],
};

describe("All exception filter tests", () => {
  let app: NestFastifyApplication;
  let service: AllExceptionsFilter;
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [AllExceptionsFilter, ConfigService],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    service = moduleFixture.get<AllExceptionsFilter>(AllExceptionsFilter);
  });

  afterAll(async () => {
    // Avoid vi open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });

    await app.close();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should handle Problem detail error", () => {
    const problem = new ProblemDetailsError(403, "Custom Error", {
      detail: "Custom detail",
    });
    const response = service.catch(problem, mockArgumentsHost);
    expect(response).toStrictEqual({
      code: 403,
      type: "application/problem+json",
      send: {
        title: "Custom Error",
        detail: "Custom detail",
        status: 403,
        type: "about:blank",
      },
    });
  });

  it("should handle NotFoundException", () => {
    const detail = "Object Not Found";
    const exception = new NotFoundException(detail);
    const response = service.catch(exception, mockArgumentsHost);
    expect(response).toStrictEqual({
      code: 404,
      type: "application/problem+json",
      send: {
        title: "Not Found",
        detail,
        status: 404,
        type: "about:blank",
      },
    });
  });

  it("should handle BadRequestException", () => {
    const detail = "Bad Parameter";
    const exception = new BadRequestException(detail);
    const response = service.catch(exception, mockArgumentsHost);
    expect(response).toStrictEqual({
      code: 400,
      type: "application/problem+json",
      send: {
        title: "Bad Request",
        detail,
        status: 400,
        type: "about:blank",
      },
    });
  });

  describe("Axios errors", () => {
    const axiosError: AxiosError = {
      isAxiosError: true,
      toJSON: () => ({}),
      name: "Error",
      message: "error",
    };

    const expectedError = {
      code: 500,
      type: "application/problem+json",
      send: {
        title: "Internal Server Error",
        detail:
          "The server encountered an internal error and was unable to complete your request",
        status: 500,
        type: "about:blank",
      },
    };

    it("should handle error", () => {
      const response = service.catch(axiosError, mockArgumentsHost);
      expect(response).toStrictEqual(expectedError);
    });

    it("should handle error.response", () => {
      const error = {
        ...axiosError,
        response: {
          data: "error",
          status: 400,
          headers: null,
          statusText: "Error 400",
          config: null,
        },
      };
      const response = service.catch(error, mockArgumentsHost);
      expect(response).toStrictEqual(expectedError);
    });

    it("should handle error.request", () => {
      const error = {
        ...axiosError,
        request: { url: "/" },
      };
      const response = service.catch(error, mockArgumentsHost);
      expect(response).toStrictEqual(expectedError);
    });
  });
});
