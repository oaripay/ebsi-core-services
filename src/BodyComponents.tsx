import React, { ReactElement } from "react";

import { Route, Switch } from "react-router-dom";
import { config } from "./config";
import RegisterDid from "./pages/RegisterDid/RegisterDid";
import TrustedAppRegistry from "./pages/TrustedAppRegistry/TrustedAppRegistry";
import Main from "./pages/Main/Main";
import { RegisterDidProvider } from "./pages/RegisterDid/RegisterDid.context";

export default function BodyComponents(): ReactElement {
  return (
    <Switch>
      <Route exact path={config.routes.trustedAppsRegistry}>
        <TrustedAppRegistry />
      </Route>
      <Route exact path={config.routes.registerDid}>
        <RegisterDidProvider>
          <RegisterDid />
        </RegisterDidProvider>
      </Route>
      <Route path="*">
        <Main />
      </Route>
    </Switch>
  );
}
