import React from "react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { Layout } from "./components/layout/Layout";
import { Home } from "./routes/home/Home";
import { NotFound } from "./routes/not-found/NotFound";
import { Authentication } from "./routes/authentication/Authentication";
// EBSIINT-3061: disable link to Terms and conditions
// import { TermsConditions } from "./routes/full-terms/TermsConditions";
import config from "./env";

const { PUBLIC_URL } = config;

const basename = PUBLIC_URL.startsWith("http")
  ? new URL(PUBLIC_URL).pathname
  : PUBLIC_URL;

function App(): JSX.Element {
  return (
    <BrowserRouter basename={basename}>
      <GoogleReCaptchaProvider reCaptchaKey={config.REACT_APP_CAPTCHA_KEY}>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/authentication" element={<Authentication />} />
            {/* EBSIINT-3061: disable link to Terms and conditions */}
            {/*
          <Route exact path="/terms" component={TermsConditions} />
          */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </GoogleReCaptchaProvider>
    </BrowserRouter>
  );
}

export default App;
