import express from "express";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
import http from "http";
import net from "net";
import YAML from "yamljs";
import * as bodyParser from "body-parser";
import { WALLET_API_ERRORS } from "src/error";
import ComponentSecureEnclave from "src/libs/authManager/secureEnclave/ComponentSecureEnclave";
import { onErrorResponse, PRINT_INFO, PRINT_ERROR } from "src/utils/Util";
import { EBSI_SERVICE, OPENAPI_PATH, COMPONENT_KEYSTORE } from "src/config";
import AuthmanagerRouter from "src/api/authManager/router";
import IdentityHubRouter from "src/api/identityHub/router";

class App {
  private connection!: http.Server;

  private router!: AuthmanagerRouter | IdentityHubRouter;

  public constructor(ebsiService: string, private httpServer = express()) {
    this.httpServer.use(bodyParser.urlencoded({ extended: true }));
    this.httpServer.use(bodyParser.json());
    this.httpServer.use(cors());
    this.httpServer.use(onErrorResponse);

    switch (ebsiService) {
      case EBSI_SERVICE.NAME.WALLET_AUTHMANAGER:
        this.router = new AuthmanagerRouter(this.httpServer);
        break;
      case EBSI_SERVICE.NAME.CREDENTIAL:
        this.router = new IdentityHubRouter(
          this.httpServer,
          YAML.load(OPENAPI_PATH)
        );
        this.httpServer.use(
          EBSI_SERVICE.SWAGGER.CREDENTIAL,
          swaggerUi.serve,
          swaggerUi.setup(YAML.load(OPENAPI_PATH))
        );
        break;
      default:
        throw Error(WALLET_API_ERRORS.NO_EBSI_SERVICE_AVAILABLE);
    }
  }

  public Start = async (port: number): Promise<http.Server> => {
    const did: string = await ComponentSecureEnclave.Instance.init(
      COMPONENT_KEYSTORE
    );
    if (!did) throw Error(WALLET_API_ERRORS.ENCLAVE_DID_NULL);
    PRINT_INFO(`Component Secure Enclave initialized with DID:${did}`);

    return new Promise((resolve, reject) => {
      this.connection = this.httpServer
        .listen(port, () => {
          resolve(this.connection);
        })
        .on("error", (err: any) => {
          reject(err);
        });
    });
  };
}

export const startEbsiService = async (
  service: string,
  port: number,
  swaggerUrl: string
): Promise<http.Server> => {
  const app = new App(service);
  let server!: http.Server;
  try {
    server = await app.Start(port);
    PRINT_INFO(
      `Server ${service} running on port ${
        (server.address() as net.AddressInfo).port
      }, swagger available at: ${swaggerUrl}`
    );
  } catch (error) {
    PRINT_ERROR(error);
  }
  return server;
};

export default App;
