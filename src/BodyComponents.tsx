import React, { ReactElement, useContext } from "react";

import { NewApp } from "./NewApp";
import { ModalEditApp } from "./Modals/ModalEditApp";
import { AppContext } from "./AppContext";
import OperatorWarning from "./OperatorWarning";
import ModalInsertPublicKey from "./Modals/ModalInsertPublicKey";
import ModalInsertAuth from "./Modals/ModalInsertAuth";

export default function BodyComponents(): ReactElement {
  const appCtx = useContext(AppContext);

  if (!appCtx.metamask) {
    return <></>;
  }

  return (
    <>
      <OperatorWarning />
      <NewApp />
      <ModalInsertPublicKey />
      <ModalInsertAuth />
      <ModalEditApp />
    </>
  );
}
