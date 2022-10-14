import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import queryString from "query-string";
import QRCode from "qrcode.react";
import { MemoizedIcon } from "../../ui-components/icon/Icon";
import { PageHeader } from "../../ui-components/page-header/PageHeader";
import { WalletButtons } from "../../components/wallets-buttons/WalletButtons";
import { wallets, session } from "../../types";
import { validateSession } from "../../apis/onboarding";
import { Button } from "../../ui-components/button/Button";

interface State {
  sessionToken: string;
}
export function Authentication(): JSX.Element {
  const location = useLocation();
  const [sessionToken, setSessionToken] = useState("");
  const [missingToken, setMissingToken] = useState(false);
  const [euLoginError, setEuLoginError] = useState(false);
  const [wallet, setWalletOption] = useState(wallets.default.NONE);
  const navigate = useNavigate();

  const copy = async () => {
    await navigator.clipboard.writeText(sessionToken);
  };

  useEffect(() => {
    // EU Login
    const ticketFromUrl = queryString.parse(location.search).ticket;
    async function getSessionToken() {
      const sessionRequest: session.SessionRequest = {
        onboarding: "eu-login",
        info: {
          "eul-ticket": ticketFromUrl as string,
        },
      };
      const response = await validateSession(sessionRequest);
      if (response.status === 200 || response.status === 201) {
        setSessionToken((response.data as session.SessionResponse).Bearer);
      } else {
        setEuLoginError(true);
      }
    }
    if (ticketFromUrl) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      getSessionToken();
      return;
    }

    // reCAPTCHA
    const locationState = location.state as State;
    if (locationState && locationState.sessionToken) {
      setSessionToken(locationState.sessionToken);
      return;
    }

    // Error: neither EU Login ticket nor reCAPTCHA session token available
    setMissingToken(true);

    // Run useEffect only on component first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (missingToken) {
    navigate("/");
    return null;
  }

  if (euLoginError) {
    return (
      <>
        <PageHeader title="Retrieving session token" />
        <div className="ecl-container ecl-u-mb-l ecl-u-mb-md-2xl">
          <p className="ecl-u-type-bold ecl-u-type-m ecl-u-type-color-red">
            An error happened during the validation of the EU Login ticket.
            Please contact the support.
          </p>
        </div>
      </>
    );
  }

  if (!sessionToken) {
    return (
      <>
        <PageHeader title="Retrieving session token" />
        <div className="ecl-container ecl-u-mb-l ecl-u-mb-md-2xl">
          <p className="ecl-u-type-bold ecl-u-type-m">Please wait...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="What kind of wallet are you using?" />
      <div className="ecl-container ecl-u-mb-l ecl-u-mb-md-2xl">
        <WalletButtons setWalletOption={setWalletOption} />
        {wallet === wallets.default.DESKTOP && (
          <>
            <div className="ecl-u-d-flex ecl-u-align-items-center ecl-u-flex-wrap">
              <p className="ecl-u-type-bold ecl-u-type-m ecl-u-flex-shrink-0 ecl-u-flex-grow-1">
                Copy or download your session token.
              </p>
              <div>
                <Button
                  onClick={copy}
                  onKeyDown={copy}
                  label="Copy"
                  icon={{
                    shape: "general--copy",
                    size: "m",
                  }}
                  variant="text"
                  type="button"
                />
                <a
                  href={`data:text/json;charset=utf-8,${encodeURIComponent(
                    JSON.stringify({ sessionToken })
                  )}`}
                  download="sessionToken.json"
                  className="ecl-button ecl-button--text ecl-u-type-color-black"
                >
                  <span className="ecl-button__container">
                    <span className="ecl-button__label" data-ecl-label="true">
                      Download
                    </span>
                    <MemoizedIcon
                      className="ecl-button__icon ecl-button__icon--after"
                      shape="ui--download"
                      size="m"
                    />
                  </span>
                </a>
              </div>
            </div>
            <pre className="ecl-u-bg-grey-10 ecl-u-pa-l token">
              {sessionToken}
            </pre>
          </>
        )}
        {wallet === wallets.default.MOBILE && (
          <div>
            <p className="ecl-u-type-bold ecl-u-type-m">
              Scan the session token with your app.
            </p>
            <QRCode value={sessionToken} size={256} />
          </div>
        )}
        {wallet === wallets.default.EBSI_WALLET && (
          <div className="ecl-message ecl-message--error content-ebsi-wallet">
            <p className="ecl-message__title centered">Not implemented yet.</p>
            <code>
              {" "}
              <p className="token">{sessionToken}</p>
            </code>
          </div>
        )}
      </div>
    </>
  );
}

export default Authentication;
