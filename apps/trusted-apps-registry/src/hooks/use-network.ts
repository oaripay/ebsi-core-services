import { useCallback } from "react";
import { useAppContext } from "../AppContext";
import { useEthersHook } from "./use-ethers.hook";
import { config } from "../config";

export default function useNetwork() {
  const appCtx = useAppContext();

  const { provider } = useEthersHook();

  const isAcceptedChain = useCallback(() => {
    if (!provider) {
      return undefined;
    }
    if (appCtx.metamask) {
      return provider
        .getNetwork()
        .then((network) => {
          return network.chainId === Number(config.EBSI_CHAIN_ID);
        })
        .catch(() => {
          return false;
        });
    }
    return undefined;
  }, [appCtx.metamask, provider]);

  return {
    isAcceptedChain,
  };
}
