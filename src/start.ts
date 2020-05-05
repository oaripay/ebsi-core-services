/* eslint-disable operator-linebreak */
import { EBSI_SERVICE, ENVIRONMENT } from "./config";
import { startEbsiService } from "./api/app";

const startAll = async (): Promise<void> => {
  await startEbsiService(
    EBSI_SERVICE.NAME.IDHUB,
    EBSI_SERVICE.PORT.IDHUB,
    ENVIRONMENT === "local" || ENVIRONMENT === "test"
      ? EBSI_SERVICE.SWAGGER_INTERNAL_URL.IDHUB
      : EBSI_SERVICE.SWAGGER_EXTERNAL_URL.IDHUB
  );
};

startAll();

export default startAll;
