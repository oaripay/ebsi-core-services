import { useEffect, useState } from "react";
import useTrustedSchemasRegistry from "../TrustedShemasRegistry/hooks/use-trusted-schemas-registry";
import usePolicies from "../TrustedPoliciesRegistry/usePolicies";
import useTotalTrustedIssuer from "../TrustedIssuersRegistry/hooks/use-total-trusted-issuer";
import { useTrustedAppHook } from "../TrustedAppRegistry/use-trusted-app.hook";

export default function useStats() {
  const { getTotal: getTotalSchemas } = useTrustedSchemasRegistry();
  const { getTotal: getTotalPolicies } = usePolicies();
  const { getTotal: getTotalTrustedIssuers } = useTotalTrustedIssuer();
  const { getTotal: getTotalApps } = useTrustedAppHook();

  const [nrOfSchemas, setNrOfSchemas] = useState(0);
  const [nrOfPolicies, setNrOfPolicies] = useState(0);
  const [nrOfTrustedIssuers, setNrOfTrustedIssuers] = useState(0);
  const [nrOfApps, setNrOfApps] = useState(0);

  useEffect(() => {
    Promise.all([
      getTotalSchemas().then((nr: number) => {
        setNrOfSchemas(nr);
      }),
      getTotalPolicies().then((nr: number) => {
        setNrOfPolicies(nr);
      }),
      getTotalTrustedIssuers().then((nr: number) => {
        setNrOfTrustedIssuers(nr);
      }),
      getTotalApps().then((nr: number) => {
        setNrOfApps(nr);
      }),
    ]);
  });

  return {
    nrOfSchemas,
    nrOfPolicies,
    nrOfTrustedIssuers,
    nrOfApps,
  };
}
