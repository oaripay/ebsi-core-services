import React, { createContext, ReactNode, useContext } from "react";
import useDidRegisterEffects, {
  DidRecordDataType,
} from "./use-did-register-effects";

type RegisterDidContextType = {
  publicKey: string;
  networkId: number;
  didDefined: boolean;
  didRecord: DidRecordDataType;
  didAsAdministrator: boolean;
  loading: boolean;
};

export const RegisterDidContext = createContext<RegisterDidContextType>({
  publicKey: "",
  networkId: 0,
  didDefined: false,
  didRecord: {},
  didAsAdministrator: false,
  loading: false,
});

export function RegisterDidProvider({ children }: { children: ReactNode }) {
  const {
    publicKey,
    networkId,
    didDefined,
    didRecord,
    didAsAdministrator,
    loading,
  } = useDidRegisterEffects();

  return (
    <RegisterDidContext.Provider
      value={{
        publicKey,
        networkId,
        didDefined,
        didRecord,
        didAsAdministrator,
        loading,
      }}
    >
      {children}
    </RegisterDidContext.Provider>
  );
}

export function useRegisterDidContext(): RegisterDidContextType {
  return useContext(RegisterDidContext);
}
