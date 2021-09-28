import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import useDidRegisterEffects, {
  DidRecordDataType,
} from "./use-did-register-effects";
import useDidRegister from "./use-did-register";
import { createDidIdentifier } from "./DidUtils";

type RegisterDidContextType = {
  publicKey: string;
  networkId: number;
  didDefined: boolean;
  didRecord: DidRecordDataType;
  didAsAdministrator: boolean;
  loading: boolean;
  identifier: string;
};

export const RegisterDidContext = createContext<RegisterDidContextType>({
  publicKey: "",
  networkId: 0,
  didDefined: false,
  didRecord: {},
  didAsAdministrator: false,
  loading: false,
  identifier: "",
});

export function RegisterDidProvider({ children }: { children: ReactNode }) {
  const { registerDidToLs, getDidFromLs } = useDidRegister();

  const [identifier, setIdentifier] = useState("");
  const {
    publicKey,
    networkId,
    didDefined,
    didRecord,
    didAsAdministrator,
    loading,
    walletAddress,
  } = useDidRegisterEffects({
    identifier,
  });

  useEffect(() => {
    if (walletAddress) {
      let did = getDidFromLs(walletAddress);
      if (!did) {
        did = createDidIdentifier();
        registerDidToLs(did);
      }
      setIdentifier(did);
    }
  }, [getDidFromLs, identifier, registerDidToLs, walletAddress]);

  return (
    <RegisterDidContext.Provider
      value={{
        publicKey,
        networkId,
        didDefined,
        didRecord,
        didAsAdministrator,
        loading,
        identifier,
      }}
    >
      {children}
    </RegisterDidContext.Provider>
  );
}

export function useRegisterDidContext(): RegisterDidContextType {
  return useContext(RegisterDidContext);
}
