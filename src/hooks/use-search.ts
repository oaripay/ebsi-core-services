import { useCallback, useMemo } from "react";
import Fuse from "fuse.js";
import { useAppContext } from "../AppContext";
import { useRegistryContractHook } from "./use-registry-contract.hook";

export function useSearch() {
  const {
    tableDataSource,
    setTableFilteredDataSource,
    setTableLoading,
    setMissingApps,
  } = useAppContext();
  const { getAppByName, getApplications } = useRegistryContractHook();

  const options = useMemo(
    () => ({
      shouldSort: true,
      threshold: 0,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      tokenize: true,
      matchAllTokens: true,
      findAllMatches: true,
      minMatchCharLength: 1,
      keys: ["name"],
    }),
    []
  );

  const fuse = useMemo(
    () => new Fuse(tableDataSource, options),
    [tableDataSource, options]
  );

  const search = useCallback(
    (word) => {
      if (!word) {
        if (tableDataSource.length) {
          setTableFilteredDataSource(tableDataSource);
        }
        return;
      }

      getAppByName(word)
        .then((result: { applicationId: string }) => {
          if (result.applicationId) {
            setTableLoading(true);
            getApplications([result.applicationId]).then((data: any) => {
              setTableFilteredDataSource(data.tableData);
              getApplications(data.missingAppsFromTable).then(
                (missingApps: any) => {
                  setMissingApps(missingApps.tableData);
                }
              );
            });
          } else {
            setTableLoading(true);
            setTableFilteredDataSource(
              fuse.search(word).map((data) => data.item)
            );
          }
        })
        .catch(() => {
          setTableFilteredDataSource(
            fuse.search(word).map((data) => data.item)
          );
        });
    },
    [
      getAppByName,
      tableDataSource,
      setTableFilteredDataSource,
      setTableLoading,
      getApplications,
      setMissingApps,
      fuse,
    ]
  );

  return {
    search,
  };
}
