import React from "react";
import { Switch, Route, BrowserRouter } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Home } from "./routes/home/Home";
import { NotFound } from "./routes/not-found/NotFound";
import { Authentication } from "./routes/authentication/Authentication";
import { TermsConditions } from "./routes/full-terms/TermsConditions";
import config from "./env";

const { PUBLIC_URL } = config;

const basename = PUBLIC_URL.startsWith("http")
  ? new URL(PUBLIC_URL).pathname
  : PUBLIC_URL;

function App(): JSX.Element {
  return (
    <BrowserRouter basename={basename}>
      <Layout>
        <Switch>
          <Route exact path="/" component={Home} />
          <Route exact path="/authentication" component={Authentication} />
          <Route exact path="/terms" component={TermsConditions} />
          <Route path="*">
            <NotFound />
          </Route>
        </Switch>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
