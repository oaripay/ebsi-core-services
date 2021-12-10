import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { AxiosError } from "axios";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { ProblemDetailsError } from "@cef-ebsi/problem-details-errors";
import { AllExceptionsFilter } from "./http-exception.filter";

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

const mockGetRequest = jest.fn().mockImplementation(() => ({
  url: "/blockchains/besu",
  body: {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_sendRawTransaction",
    params: ["0x0"],
  },
}));

const mockHttpArgumentsHost = jest.fn().mockImplementation(() => ({
  getResponse: mockGetResponse,
  getRequest: mockGetRequest,
}));

const mockArgumentsHost = {
  switchToHttp: mockHttpArgumentsHost,
  getArgByIndex: jest.fn(),
  getArgs: jest.fn(),
  getType: jest.fn(),
  switchToRpc: jest.fn(),
  switchToWs: jest.fn(),
};

describe("All exception filter tests", () => {
  let app: INestApplication;
  let service: AllExceptionsFilter;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [AllExceptionsFilter],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    service = moduleFixture.get<AllExceptionsFilter>(AllExceptionsFilter);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
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
