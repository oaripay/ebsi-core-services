import { useCallback } from "react";
import BigNumber from "bn.js";
import { useEthersHook } from "../../hooks/use-ethers.hook";

export default function useSearch() {
  const { policyRegistryContract } = useEthersHook();

  const search = useCallback(
    async (searchTerm: string) => {
      if (!policyRegistryContract) {
        return [];
      }
      const results = await policyRegistryContract.searchPolicy(searchTerm);
      const findingsByPolicyName = results.byPolicyName;
      const findingsByRegistryName = results.byRegistryName;

      return [
        ...[...findingsByPolicyName, ...findingsByRegistryName].map(
          (item: BigNumber) => item.toNumber()
        ),
      ];
    },
    [policyRegistryContract]
  );

  return {
    search,
  };
}
