import { useContext, useEffect } from "react";
import { notification } from "antd";

import { useEthersHook } from "./use-ethers.hook";
import { config } from "../config";
import { AppContext } from "../AppContext";
import { useRegistryContractHook } from "./use-registry-contract.hook";

export function useRegistryContractEventsHook() {
  const { registryContract } = useEthersHook();
  const appCtx = useContext(AppContext);

  const { provider } = useEthersHook();
  const { getApplications } = useRegistryContractHook();

  useEffect(() => {
    if (appCtx.metamask) {
      provider
        .getNetwork()
        .then((network) => {
          if (network.chainId !== config.EBSI_CHAIN_ID) {
            notification.warn({
              message: "EBSI wrong network",
              description: "Please select corresponding network for EBSI",
            });
          }
        })
        .catch(() => {
          // console.log("errr");
        });
    }
  }, [provider, appCtx.metamask]);

  useEffect(() => {
    if (appCtx.metamask) {
      registryContract.on("AddNewAuthorization", () => {
        notification.success({
          message: "Transaction mined",
          description: `A new authorization was added!`,
        });
      });
      registryContract.on("PublicKeyAdded", () => {
        notification.success({
          message: "Transaction mined",
          description: `A new public key was added!`,
        });
      });
      registryContract.on("ApplicationUpdated", () => {
        notification.success({
          message: "Transaction mined",
          description: `An app has been updated!`,
        });
      });
      registryContract.on("PublicKeyUpdated", () => {
        notification.success({
          message: "Transaction mined",
          description: `A public key was updated!`,
        });
      });
      registryContract.on("ApplicationRegistered", () => {
        if (!appCtx.tableDataSource.length) {
          appCtx.setTableLoading(true);
          getApplications().then((data: any) => {
            appCtx.setTableDataSource(data);
          });
        }
        notification.success({
          message: "Transaction mined",
          description: `A new application was created!`,
        });
      });
    }
  }, [appCtx.metamask, registryContract]);
}
