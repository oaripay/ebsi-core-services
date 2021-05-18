import React, { useState } from "react";
import { Terms } from "../../components/terms/Terms";
import { LoginButtons } from "../../components/login-buttons/LoginButtons";

export function Home(): JSX.Element {
  const [isTermsSelected, setTermsSelected] = useState<boolean>(false);

  return (
    <div className="ecl-container ecl-u-pv-l ecl-u-pv-md-2xl">
      <Terms
        isTermsSelected={isTermsSelected}
        setTermsSelected={setTermsSelected}
      />
      {isTermsSelected && <LoginButtons />}
    </div>
  );
}

export default Home;
