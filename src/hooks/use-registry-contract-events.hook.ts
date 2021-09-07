import { useContext, useEffect } from "react";
import { notification } from "antd";

import { useEthersHook } from "./use-ethers.hook";
import { config } from "../config";
import { AppContext } from "../AppContext";

export function useRegistryContractEventsHook() {
  const appCtx = useContext(AppContext);

  const { provider } = useEthersHook();

  useEffect(() => {
    if (!provider) {
      return;
    }
    if (appCtx.metamask) {
      provider
        .getNetwork()
        .then((network) => {
          if (network.chainId !== Number(config.EBSI_CHAIN_ID)) {
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
}
