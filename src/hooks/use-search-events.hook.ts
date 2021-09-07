import { useContext, useEffect } from "react";
import { AppContext } from "../AppContext";
import { useSearch } from "./use-search";

export function useSearchEventsHook() {
  const appCtx = useContext(AppContext);
  const { search } = useSearch();

  useEffect(() => {
    if (appCtx.searchedTerm) {
      search(appCtx.searchedTerm.trim());
    }
  }, [appCtx.searchedTerm, search]);
}
