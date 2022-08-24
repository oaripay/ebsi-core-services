import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import useDidRegisterEffects from "./hooks/use-did-register-effects";
import useDidRegister from "./hooks/use-did-register";
import { createDidIdentifier } from "./DidUtils";
import { DidRecordType, HashAlgo } from "./DidTableTypes";

type RegisterDidContextType = {
  publicKey: string;
  networkId: number;
  didDefined: boolean;
  didRecord: DidRecordType;
  didAsAdministrator: boolean;
  loading: boolean;
  identifier: string;
  hashAlgos: HashAlgo[];
};

export const RegisterDidContext = createContext<RegisterDidContextType>({
  publicKey: "",
  networkId: 0,
  didDefined: false,
  didRecord: {},
  didAsAdministrator: false,
  loading: false,
  identifier: "",
  hashAlgos: [],
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
    hashAlgos,
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
        hashAlgos,
      }}
    >
      {children}
    </RegisterDidContext.Provider>
  );
}

export function useRegisterDidContext(): RegisterDidContextType {
  return useContext(RegisterDidContext);
}
