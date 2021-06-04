import { useCallback, useContext, useMemo } from "react";
import Fuse from "fuse.js";
import { AppContext } from "../AppContext";
import { useRegistryContractHook } from "./use-registry-contract.hook";

export function useSearch() {
  const appCtx = useContext(AppContext);
  const { getAppByName, getApplications } = useRegistryContractHook();
  const options = {
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
  };

  const fuse = useMemo(() => new Fuse(appCtx.tableDataSource, options), [
    appCtx.tableDataSource,
  ]);

  const search = useCallback(
    (word) => {
      if (!word) {
        appCtx.setTableFilteredDataSource(appCtx.tableDataSource);
        return;
      }

      getAppByName(word)
        .then((result: { applicationId: string }) => {
          if (result.applicationId) {
            appCtx.setTableLoading(true);
            getApplications([result.applicationId]).then((data: any) => {
              appCtx.setTableFilteredDataSource(data.tableData);
              getApplications(data.missingAppsFromTable).then(
                (missingApps: any) => {
                  appCtx.setMissingApps(missingApps.tableData);
                }
              );
              appCtx.setClearInput(true);
            });
          } else {
            appCtx.setTableLoading(true);
            appCtx.setTableFilteredDataSource(
              fuse.search(word).map((data) => data.item)
            );
          }
        })
        .catch(() => {
          appCtx.setTableFilteredDataSource(
            fuse.search(word).map((data) => data.item)
          );
        });
    },
    [
      appCtx.tableDataSource,
      getApplications,
      getAppByName,
      appCtx.page,
      fuse,
      appCtx.setTableLoading,
      appCtx.setTableFilteredDataSource,
    ]
  );

  return {
    search,
  };
}
