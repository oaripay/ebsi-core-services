import { useContext, useMemo } from "react";
import { ethers } from "ethers";

import { config } from "../config";

import TarRegistry from "../contracts/tar.json";
import DidRegistry from "../contracts/DidRegistry.json";
import { AppContext } from "../AppContext";

export function useEthersHook() {
  const appCtx = useContext(AppContext);

  const provider:
    | ethers.providers.Web3Provider
    | ethers.providers.JsonRpcProvider = useMemo(() => {
    if (appCtx.metamask) {
      return new ethers.providers.Web3Provider(appCtx.metamask);
    }
    return new ethers.providers.JsonRpcProvider();
  }, [appCtx.metamask]);

  const registryContract = useMemo(() => {
    const contract = new ethers.Contract(
      config.REGISTRY_ADDRESS,
      TarRegistry,
      provider
    );
    return contract.connect(provider.getSigner());
  }, [provider]);

  const didRegistryContract = useMemo(() => {
    const contract = new ethers.Contract(
      config.DID_REGISTRY_ADDRESS,
      DidRegistry,
      provider
    );
    return contract.connect(provider.getSigner());
  }, [provider]);

  return { provider, registryContract, didRegistryContract };
}
