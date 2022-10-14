import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleReCaptcha } from "react-google-recaptcha-v3";
import { loginLink } from "../../apis/ecas";
import { Button } from "../../ui-components/button/Button";
import validateSession from "../../apis/onboarding";
import { session } from "../../types";

export const LoginButtons: React.FunctionComponent = () => {
  const [captchaToken, setCaptchaToken] = useState("");

  const navigate = useNavigate();

  const euLogin = useCallback(() => {
    window.location.assign(loginLink());
  }, []);

  const onVerifyCaptcha = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const captchaLogin = useCallback(async () => {
    const sessionRequest: session.SessionRequest = {
      onboarding: "recaptcha",
      info: {
        token: captchaToken,
      },
    };
    const response = await validateSession(sessionRequest);
    if (response.status === 200 || response.status === 201) {
      navigate("/authentication", {
        state: {
          sessionToken: (response.data as session.SessionResponse).Bearer,
        },
      });
    }
  }, [captchaToken, navigate]);

  return (
    <div className="ecl-row">
      <div className="ecl-col-12 ecl-col-md-6">
        <p className="ecl-u-type-paragraph">
          I don&#8217;t have an EU Login Account.
        </p>
        <GoogleReCaptcha action="login" onVerify={onVerifyCaptcha} />
        <Button
          variant="secondary"
          type="button"
          onClick={captchaLogin}
          label="Onboard with Captcha"
          disabled={!captchaToken}
        />
      </div>
      <div className="ecl-col-12 ecl-col-md-6">
        <p className="ecl-u-type-paragraph">I have an EU Login Account.</p>
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
