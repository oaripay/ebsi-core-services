import React, { ReactElement, useContext } from "react";
import useWalletHook from "../../hooks/use-wallet.hook";

export type WalletContextType = {
  walletAddress: string;
};

const defaultValue: any = {};
export const WalletContext =
  React.createContext<WalletContextType>(defaultValue);

export function WalletProvider({
  children,
}: {
  children: ReactElement | ReactElement[];
}) {
  const { walletAddress } = useWalletHook();

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  return useContext(WalletContext);
}
