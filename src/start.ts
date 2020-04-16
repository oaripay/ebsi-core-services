/* eslint-disable operator-linebreak */
import { EBSI_SERVICE, ENVIRONMENT } from "src/config";
import { startEbsiService } from "src/api/app";

const startAll = async (): Promise<void> => {
  await startEbsiService(
    EBSI_SERVICE.NAME.WALLET_AUTHMANAGER,
    EBSI_SERVICE.PORT.WALLET_AUTHMANAGER,
    EBSI_SERVICE.SWAGGER_FULL_URL.WALLET_AUTHMANAGER
  );
  await startEbsiService(
    EBSI_SERVICE.NAME.IDHUB,
    EBSI_SERVICE.PORT.IDHUB,
    ENVIRONMENT === "local"
      ? EBSI_SERVICE.SWAGGER_FULL_URL.IDHUB
      : EBSI_SERVICE.EXTERNAL_SWAGGER_FULL_URL.IDHUB
  );
};

startAll();

export default startAll;
