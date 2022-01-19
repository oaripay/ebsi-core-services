import { useCallback, useMemo } from "react";
import Fuse from "fuse.js";
import { useAppContext } from "../AppContext";
import { useTrustedAppHook } from "../pages/TrustedAppRegistry/use-trusted-app.hook";

export function useSearch() {
  const { tableDataSource, setTableFilteredDataSource, setTableLoading } =
    useAppContext();
  const { getAppByName, getApplications } = useTrustedAppHook();

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
      fuse,
    ]
  );

  return {
    search,
  };
}
