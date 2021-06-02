// EBSIINT-3061: remove Terms and conditions box
// import React, { useState } from "react";
import React from "react";
import { Terms } from "../../components/terms/Terms";
import { LoginButtons } from "../../components/login-buttons/LoginButtons";
import { PageHeader } from "../../ui-components/page-header/PageHeader";

export function Home(): JSX.Element {
  // EBSIINT-3061: remove Terms and conditions box
  // const [isTermsSelected, setTermsSelected] = useState<boolean>(false);

  return (
    <>
      {(() => {
        if (process.env.REACT_APP_EBSI_ENV === "local") {
          return <PageHeader title="Welcome to the Local environment" />;
        }

        if (process.env.REACT_APP_EBSI_ENV === "test") {
          return <PageHeader title="Welcome to the Test environment" />;
        }

        if (process.env.REACT_APP_EBSI_ENV === "pilot") {
          return (
            <PageHeader title="Welcome to the PreProduction environment" />
          );
        }

        return <PageHeader title="Welcome to the Production environment" />;
      })()}
      {/* EBSIINT-3061: remove Terms and conditions box */}
      {/*
      <div className="ecl-container ecl-u-mt-m ecl-u-mb-xl">
        <Terms
          isTermsSelected={isTermsSelected}
          setTermsSelected={setTermsSelected}
        />
        {isTermsSelected && <LoginButtons />}
      </div>
      */}
      <div className="ecl-container ecl-u-mb-3xl">
        <LoginButtons />
      </div>
    </>
  );
}

export default Home;
