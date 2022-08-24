import { useCallback } from "react";

const LS_DIDS_KEY = "EBSI_DIDS";

export default function useDidLs() {
  const updateDidsFromLs = useCallback((did: string) => {
    const itemsStringified = localStorage.getItem(LS_DIDS_KEY);
    try {
      const itemsParsed = JSON.parse(itemsStringified || "[]");
      if (!itemsParsed.includes(did)) {
        localStorage.setItem(
          LS_DIDS_KEY,
          JSON.stringify([...itemsParsed, did])
        );
      }
    } catch (ex) {
      //
    }
  }, []);

  const getDidsFromLs = useCallback(() => {
    try {
      const itemsStringified = localStorage.getItem(LS_DIDS_KEY);
      if (itemsStringified) {
        return JSON.parse(itemsStringified);
      }
      return [];
    } catch (ex) {
      return [];
    }
  }, []);

  const removeDidsFromLs = useCallback(() => {
    localStorage.removeItem(LS_DIDS_KEY);
  }, []);

  return {
    updateDidsFromLs,
    getDidsFromLs,
    LS_DIDS_KEY,
    removeDidsFromLs,
  };
}
