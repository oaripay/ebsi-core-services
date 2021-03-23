import React, { ReactElement, useContext } from "react";

import { NewApp } from "./NewApp";
import { AppContext } from "./AppContext";
import ModalInsertPublicKey from "./Modals/ModalInsertPublicKey";
import ModalInsertAuth from "./Modals/ModalInsertAuth";
import { useRegistryContractEventsHook } from "./hooks/use-registry-contract-events.hook";

export default function BodyComponents(): ReactElement {
  const appCtx = useContext(AppContext);
  useRegistryContractEventsHook();

  if (!appCtx.metamask) {
    return <></>;
  }

  return (
    <>
      <NewApp />
      <ModalInsertPublicKey />
      <ModalInsertAuth />
    </>
  );
}
