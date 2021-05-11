import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import queryString from "query-string";
import QRCode from "qrcode.react";
import { MemoizedIcon } from "../../ui-components/icon/Icon";
import { PageHeader } from "../../ui-components/page-header/PageHeader";
import { WalletButtons } from "../../components/wallets-buttons/WalletButtons";
import { wallets, session } from "../../types";
import validateSession from "../../apis/onboarding";

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
      <PageHeader
        title="Choose your authentication method"
        className="ecl-u-mt-xl"
      />
      <div className="ecl-container">
        {wallet === wallets.default.DESKTOP && (
          <>
            <div className="content-icons">
              <p className="ecl-message__title">
                Copy or download your session token.
              </p>
              <div
                role="button"
                onClick={copy}
                onKeyDown={copy}
                tabIndex={0}
                className="copy-icon"
              >
                <p className="label">Copy</p>
                <MemoizedIcon shape="general--copy" size="l" />
              </div>
              <a
                href={`data:text/json;charset=utf-8,${encodeURIComponent(
                  JSON.stringify({ sessionToken })
                )}`}
                download="sessionToken.json"
                className="download-icon"
              >
                <p className="label">Download</p>
                <MemoizedIcon shape="ui--download" size="l" />
              </a>
            </div>
            <code>
              {" "}
              <p className="token">{sessionToken}</p>
            </code>
          </>
        )}
        {wallet === wallets.default.MOBILE && (
          <div>
            <p className="ecl-message__title">
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
        <WalletButtons setWalletOption={setWalletOption} />
      </div>
    </>
  );
}

export default Authentication;
