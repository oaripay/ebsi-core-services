import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { CustomCaptcha } from "../custom-captcha/CustomCaptcha";
import { loginLink } from "../../apis/ecas";
import { Button } from "../../ui-components/button/Button";
import validateSession from "../../apis/onboarding";
import env from "../../env";
import { session } from "../../types";

export const LoginButtons: React.FunctionComponent = () => {
  const [captchaToken, setCaptchaToken] = useState("");
  const history = useHistory();

  const euLogin = () => {
    window.location.assign(loginLink());
  };

  const captchaLogin = async () => {
    const sessionRequest: session.SessionRequest = {
      onboarding: "recaptcha",
      info: {
        token: captchaToken,
      },
    };
    const response = await validateSession(sessionRequest);
    if (response.status === 200 || response.status === 201) {
      history.push("/authentication", {
        sessionToken: (response.data as session.SessionResponse).Bearer,
      });
    }
  };

  return (
    <div className="ecl-row ecl-u-mt-m">
      <div className="ecl-col-12 ecl-col-md-6">
        <p className="ecl-u-type-paragraph">
          I don&#8217;t have an EU Login Account.
        </p>
        <Button
          variant="secondary"
          type="button"
          onClick={captchaLogin}
          label="Onboard with Captcha"
        />
      </div>
      <div className="ecl-col-12 ecl-col-md-6">
        <p className="ecl-u-type-paragraph">I have an EU Login Account.</p>
        <GoogleReCaptchaProvider reCaptchaKey={env.REACT_APP_CAPTCHA_KEY}>
          <CustomCaptcha setCaptchaToken={setCaptchaToken} />
        </GoogleReCaptchaProvider>
        <Button
          variant="primary"
          type="button"
          onClick={euLogin}
          label="Onboard with EU Login"
          id="euLoginBtn"
        />
      </div>
    </div>
  );
};
export default LoginButtons;
