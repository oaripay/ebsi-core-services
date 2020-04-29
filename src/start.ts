/* eslint-disable operator-linebreak */
import { EBSI_SERVICE } from "./config";
import { startEbsiService } from "./api/app";

const startAll = async (): Promise<void> => {
  await startEbsiService(
    EBSI_SERVICE.NAME.IDHUB,
    EBSI_SERVICE.PORT.IDHUB,
    EBSI_SERVICE.SWAGGER_FULL_URL.IDHUB
  );
};

startAll();

export default startAll;
