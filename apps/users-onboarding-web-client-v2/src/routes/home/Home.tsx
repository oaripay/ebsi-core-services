// EBSIINT-3061: remove Terms and conditions box
// import React, { useState } from "react";
import React from "react";
// EBSIINT-3061: remove Terms and conditions box
// import { Terms } from "../../components/terms/Terms";
import { LoginButtons } from "../../components/login-buttons/LoginButtons";
import { PageHeader } from "../../ui-components/page-header/PageHeader";

export function Home(): JSX.Element {
  // EBSIINT-3061: remove Terms and conditions box
  // const [isTermsSelected, setTermsSelected] = useState<boolean>(false);

  return (
    <>
      <PageHeader title="Choose your onboarding method" />
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
