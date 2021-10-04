import { useEffect, useState } from "react";
import { useEthersHook } from "./use-ethers.hook";

export default function useWalletHook() {
  const { provider } = useEthersHook();

  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    if (provider) {
      provider
        .getSigner()
        .getAddress()
        .then((addr: string) => {
          setWalletAddress(addr);
        });
    }
  }, [provider, walletAddress]);

  return {
    walletAddress,
  };
}
