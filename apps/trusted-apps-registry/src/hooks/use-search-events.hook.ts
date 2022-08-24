import { useEffect } from "react";
import { useAppContext } from "../AppContext";
import { useSearch } from "./use-search";

export function useSearchEventsHook() {
  const appCtx = useAppContext();
  const { search } = useSearch();

  useEffect(() => {
    if (appCtx.searchedTerm) {
      search(appCtx.searchedTerm.trim());
    }
  }, [appCtx.searchedTerm, search]);
}
