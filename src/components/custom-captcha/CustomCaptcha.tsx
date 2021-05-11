import React, { useState } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

type Props = {
  setCaptchaToken: (token: string) => void;
};

export const CustomCaptcha: React.FunctionComponent<Props> = ({
  setCaptchaToken,
}: Props) => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [isCaptchaTokenRetrieved, captchaTokenRetrieved] = useState(false);
  if (executeRecaptcha && !isCaptchaTokenRetrieved) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    executeRecaptcha("login").then((token) => {
      setCaptchaToken(token);
      captchaTokenRetrieved(true);
    });
  }

  return <></>;
};
export default CustomCaptcha;
