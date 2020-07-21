import { useMemo } from "react";
import { ethers } from "ethers";

import { config } from "../config";

import Registry from "../registry-contract-abi.json";

export function useEthersHook() {
  const provider: ethers.providers.JsonRpcProvider = useMemo(() => {
    return new ethers.providers.JsonRpcProvider(config.PROVIDER);
  }, []);

  const registryContract = useMemo(() => {
    return new ethers.Contract(config.REGISTRY_ADDRESS, Registry, provider);
  }, []);

  return { provider, registryContract };
}
