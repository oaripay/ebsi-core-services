import { useEffect } from "react";
import { notification } from "antd";

import useNetwork from "./use-network";

export function useVerifyNetworkEffectHook() {
  const { isAcceptedChain } = useNetwork();

  useEffect(() => {
    isAcceptedChain()?.then((is: boolean) => {
      if (!is) {
        notification.warn({
          message: "EBSI wrong network",
          description: "Please select corresponding network for EBSI",
        });
      }
    });
  }, [isAcceptedChain]);
}
