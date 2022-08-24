import { useCallback } from "react";
import { useEthersHook } from "../../../hooks/use-ethers.hook";

export default function useTotalTrustedIssuer() {
  const { trustedIssuersContract } = useEthersHook();

  const getTotal = useCallback(async () => {
    if (!trustedIssuersContract) {
      return 0;
    }
    try {
      const issuers = await trustedIssuersContract.getIssuers(1, 1);
      return issuers.total.toNumber();
    } catch (ex) {
      return 0;
    }
  }, [trustedIssuersContract]);

  return {
    getTotal,
  };
}
