import React, { ReactElement, useContext, useEffect, useState } from "react";
import { Alert, notification } from "antd";
import { useRegistryContractHook } from "./hooks/use-registry-contract.hook";
import { AppContext } from "./AppContext";

export default function OperatorWarning(): ReactElement {
  const [operatorWarning, setOperatorWarning] = useState(false);
  const appCtx = useContext(AppContext);

  const { isOperator } = useRegistryContractHook();

  useEffect(() => {
    if (appCtx.metamask) {
      isOperator().then((isAddrOperator) => {
        if (!isAddrOperator) {
          setOperatorWarning(true);
          notification.warning({
            message: "DID not operator",
            description:
              "Your DID is not set as an operator to the Trusted App Contract. Please be aware that you will not be able to perform any updates to the smart contract!",
          });
        }
      });
    }
  }, [appCtx.metamask]);
  if (operatorWarning) {
    return (
      <Alert
        message=""
        description={
          <>
            <p>
              Your DID is not set as an operator to the Trusted App Contract.
              Please be aware that you will not be able to perform any updates
              to the smart contract! <br /> Should you have access please
              contact an administrator
            </p>
            <strong>{localStorage.getItem("Did")}</strong>
          </>
        }
        type="info"
      />
    );
  }
  return <></>;
}
