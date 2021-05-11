import React, { useState } from "react";
import { Terms } from "../../components/terms/Terms";
import { LoginButtons } from "../../components/login-buttons/LoginButtons";

export function Home(): JSX.Element {
  const [isTermsSelected, setTermsSelected] = useState<boolean>(false);

  return (
    <>
      <div className="content">
        <Terms
          isTermsSelected={isTermsSelected}
          setTermsSelected={setTermsSelected}
        />
        {isTermsSelected && <LoginButtons />}
      </div>
    </>
  );
}

export default Home;
