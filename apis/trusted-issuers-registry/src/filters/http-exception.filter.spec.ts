import { jest, describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  NotFoundException,
  BadRequestException,
  ArgumentsHost,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AxiosError } from "axios";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { ProblemDetailsError } from "@cef-ebsi/problem-details-errors";
import { AllExceptionsFilter } from "./http-exception.filter";
import { ApiConfig } from "../config/configuration";

const mockGetResponse = jest.fn().mockImplementation(() => ({
  code: jest.fn().mockImplementation((code: number) => ({
    type: jest.fn().mockImplementation((type: string) => ({
      send: jest.fn().mockImplementation((send: unknown) => ({
        code,
        type,
        send,
      })),
    })),
  })),
}));

const mockHttpArgumentsHost = jest.fn().mockImplementation(() => ({
  getResponse: mockGetResponse,
  getRequest: jest.fn(),
  getNext: jest.fn(),
})) as ArgumentsHost["switchToHttp"];

const mockArgumentsHost: ArgumentsHost = {
  switchToHttp: mockHttpArgumentsHost,
  getArgByIndex: jest.fn() as ArgumentsHost["getArgByIndex"],
  getArgs: jest.fn() as ArgumentsHost["getArgs"],
  getType: jest.fn() as ArgumentsHost["getType"],
  switchToRpc: jest.fn() as ArgumentsHost["switchToRpc"],
  switchToWs: jest.fn() as ArgumentsHost["switchToWs"],
};

describe("All exception filter tests", () => {
  let app: INestApplication;
  let service: AllExceptionsFilter;
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [AllExceptionsFilter, ConfigService],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    service = moduleFixture.get<AllExceptionsFilter>(AllExceptionsFilter);
  });

  afterAll(async () => {
    // Avoid jest open handle error
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
      config: null,
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
