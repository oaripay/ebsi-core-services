import React, { ReactElement } from "react";

import { Route, Switch } from "react-router-dom";
import { config } from "./config";
import RegisterDid from "./pages/RegisterDid/RegisterDid";
import TrustedAppRegistry from "./pages/TrustedAppRegistry/TrustedAppRegistry";
import Main from "./pages/Main/Main";
import { RegisterDidProvider } from "./pages/RegisterDid/RegisterDid.context";
import TrustedIssuersRegistry from "./pages/TrustedIssuersRegistry/TrustedIssuersRegistry";
import TrustedSchemasRegistry from "./pages/TrustedShemasRegistry/TrustedSchemasRegistry";
import TrustedPoliciesRegistry from "./pages/TrustedPoliciesRegistry/TrustedPoliciesRegistry";
import PublicKeys from "./pages/TrustedAppRegistry/PublicKeys";
import Authorizations from "./pages/TrustedAppRegistry/Authorizations";

export default function BodyComponents(): ReactElement {
  return (
    <Switch>
      <Route exact path={config.routes.trustedAppsRegistry}>
        <TrustedAppRegistry />
      </Route>
      <Route exact path={config.routes.trustedAppsRegistryPublicKeys}>
        <PublicKeys />
      </Route>
      <Route exact path={config.routes.trustedAppsRegistryAuthorizations}>
        <Authorizations />
      </Route>
      <Route exact path={config.routes.trustedIssuersRegistry}>
        <TrustedIssuersRegistry />
      </Route>
      <Route exact path={config.routes.trustedIssuersRegistryAttributes}>
        <TrustedIssuersRegistry />
      </Route>
      <Route exact path={config.routes.registerDid}>
        <RegisterDidProvider>
          <RegisterDid />
        </RegisterDidProvider>
      </Route>
      <Route exact path={config.routes.trustedSchemaRegistry}>
        <TrustedSchemasRegistry />
      </Route>
      <Route path={config.routes.trustedSchemaRegistryRevision}>
        <TrustedSchemasRegistry />
      </Route>
      <Route path={config.routes.trustedSchemaRegistryRevisionMetadata}>
        <TrustedSchemasRegistry />
      </Route>
      <Route path={config.routes.trustedPoliciesRegistryAttributes}>
        <TrustedPoliciesRegistry />
      </Route>
      <Route path={config.routes.trustedPoliciesRegistry}>
        <TrustedPoliciesRegistry />
      </Route>

      <Route path="*">
        <Main />
      </Route>
    </Switch>
  );
}
