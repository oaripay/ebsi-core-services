import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import queryString from "query-string";
import QRCode from "qrcode.react";
import { MemoizedIcon } from "../../ui-components/icon/Icon";
import { PageHeader } from "../../ui-components/page-header/PageHeader";
import { WalletButtons } from "../../components/wallets-buttons/WalletButtons";
import { wallets, session } from "../../types";
import validateSession from "../../apis/onboarding";
import { Button } from "../../ui-components/button/Button";

interface State {
  sessionToken: string;
}
export function Authentication(): JSX.Element {
  const location = useLocation();
  const [sessionToken, setSessionToken] = useState("");
  const [wallet, setWalletOption] = useState(wallets.default.NONE);

  const copy = async () => {
    await navigator.clipboard.writeText(sessionToken);
  };

  useEffect(() => {
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
      }
    }
    if (ticketFromUrl) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      getSessionToken();
    }
    const locationState = location.state as State;
    if (locationState && locationState.sessionToken) {
      setSessionToken(locationState.sessionToken);
    }

    // Run useEffect only on component first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <PageHeader title="Choose your authentication method" />
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
