import React, {
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AppContextType = {
  tableLoading: true;
  tableDataSource: any[];
  missingApps: any[];
  filteredDataSource: any[];
  setTableFilteredDataSource: (tableFilteredSource: any[]) => void;
  setTableLoading: (tableLoading: boolean) => void;
  setTableDataSource: (dataSource: any[]) => void;
  setMissingApps: (missingApps: any[]) => void;
  searchedTerm: string;
  page: number;
  setSearchedTerm: (searchedTerm: string) => void;
  setClearInput: (clearInput: boolean) => void;
  setEditModal: (params: any) => void;
  setInsertPublicKeyModal: (params: any) => void;
  editModal: { show: boolean; data: any };
  setPage: (page: number) => void;
  setUpdateAppPublicKey: (params: any) => void;
  setUpdateAuthorization: (params: any) => void;
  updateAppPublicKey: { show: boolean; data: any };
  updateAuthorization: { show: boolean; data: any };
  insertPublicKeyModal: { show: boolean; data: any; appId: string };
  setAuthorizedAppsModal: (params: any) => void;
  authorizedAppsModal: { show: boolean; data: any };
  metamask: {};
  clearInput: boolean;
};

const defaultValue: any = {};
export const AppContext = React.createContext<AppContextType>(defaultValue);
const Window: any = window;

export function AppProvider({
  children,
}: {
  children: ReactElement | ReactElement[];
}) {
  const defaultParams: {
    searchedTerm: string;
    page: number;
  } = {
    searchedTerm: "",
    page: 1,
  };

  const defaultParamsModal: { show: boolean; data: any } = {
    show: false,
    data: null,
  };

  const defaultParamsTable: {
    tableLoading: boolean;
    tableDataSource: any[];
    filteredDataSource: any[];
  } = {
    tableLoading: true,
    tableDataSource: [],
    filteredDataSource: [],
  };

  const [appState, setAppState] = useState(defaultParams);
  const [tableDataState, setTableDataState] = useState(defaultParamsTable);
  const [editModalState, setEditModalState] = useState(defaultParamsModal);

  const [insertPublicKeyModalState, setInsertPublicKeyModalState] =
    useState(defaultParamsModal);
  const [authorizedAppsModalState, setAuthorizedAppsModalState] =
    useState(defaultParamsModal);
  const [updateAppPublicKeyState, setUpdateAppPublicKeyState] =
    useState(defaultParamsModal);

  const [updateAuthorizationState, setUpdateAuthorizationState] =
    useState(defaultParamsModal);

  const basePageErr = "";

  const [pageErr, setPageErr] = useState(basePageErr);
  const [metamask, setMetamask] = useState(false);
  const [clearInput, setClearInput] = useState(false);

  useEffect(() => {
    if (!Window?.ethereum) {
      setPageErr("Please install MetaMask first.");
    }

    if (!metamask) {
      if (Window?.ethereum) {
        setMetamask(Window.ethereum);
      }
      Window?.ethereum
        .request({ method: "eth_requestAccounts" })
        .then(() => {
          setMetamask(Window.ethereum);
        })
        .catch(() => {
          setPageErr("You need to allow MetaMask.");
        });
    }
  }, [metamask]);

  useEffect(() => {
    if (Window?.ethereum) {
      Window?.ethereum.on("chainChanged", () => {
        Window.location.reload();
      });
      Window?.ethereum.on("accountsChanged", () => {
        Window.location.reload();
      });
    }
  }, []);

  const setUpdateAppPublicKey = useCallback(
    (updateAppPublicKey: any) => {
      setUpdateAppPublicKeyState({
        ...updateAppPublicKeyState,
        ...updateAppPublicKey,
      });
    },
    [updateAppPublicKeyState]
  );

  const setUpdateAuthorization = useCallback(
    (updateAuthorization: any) => {
      setUpdateAuthorizationState({
        ...updateAuthorizationState,
        ...updateAuthorization,
      });
    },
    [updateAuthorizationState]
  );

  const setTableLoading = useCallback((tableLoading) => {
    setTableDataState((current) => ({
      ...current,
      tableLoading,
    }));
  }, []);

  const setTableDataSource = useCallback((tableDataSource: any[]) => {
    setTableDataState((current) => ({
      ...current,
      tableDataSource,
      filteredDataSource: tableDataSource,
      tableLoading: false,
    }));
  }, []);

  const setTableFilteredDataSource = useCallback(
    (filteredDataSource: any[]) => {
      setTableDataState((current) => ({
        ...current,
        filteredDataSource,
        tableLoading: false,
      }));
    },
    []
  );

  const setSearchedTerm = useCallback((searchedTerm: string) => {
    setAppState((current) => ({
      ...current,
      searchedTerm,
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setAppState((current) => ({
      ...current,
      page,
    }));
  }, []);

  const setEditModal = useCallback((editModal: any) => {
    setEditModalState((current) => ({
      ...current,
      ...editModal,
    }));
  }, []);

  const setInsertPublicKeyModal = useCallback((insertPubKeyModal: any) => {
    setInsertPublicKeyModalState((current) => ({
      ...current,
      ...insertPubKeyModal,
    }));
  }, []);

  const setAuthorizedAppsModal = useCallback((authorizedAppsModal: any) => {
    setAuthorizedAppsModalState((current) => ({
      ...current,
      ...authorizedAppsModal,
    }));
  }, []);

  const values: any = useMemo(() => {
    return {
      ...appState,
      tableLoading: tableDataState.tableLoading,
      tableDataSource: tableDataState.tableDataSource,
      filteredDataSource: tableDataState.filteredDataSource,
      editModal: editModalState,
      updateAppPublicKey: updateAppPublicKeyState,
      updateAuthorization: updateAuthorizationState,
      authorizedAppsModal: authorizedAppsModalState,
      setTableLoading,
      setTableDataSource,
      setSearchedTerm,
      setTableFilteredDataSource,
      setEditModal,
      setInsertPublicKeyModal,
      setAuthorizedAppsModal,
      setUpdateAppPublicKey,
      setUpdateAuthorization,
      pageErr,
      metamask,
      setPage,
      insertPublicKeyModal: insertPublicKeyModalState,
      clearInput,
      setClearInput,
    };
  }, [
    appState,
    authorizedAppsModalState,
    clearInput,
    editModalState,
    insertPublicKeyModalState,
    metamask,
    pageErr,
    setAuthorizedAppsModal,
    setEditModal,
    setInsertPublicKeyModal,
    setPage,
    setSearchedTerm,
    setTableDataSource,
    setTableFilteredDataSource,
    setTableLoading,
    setUpdateAppPublicKey,
    setUpdateAuthorization,
    tableDataState.filteredDataSource,
    tableDataState.tableDataSource,
    tableDataState.tableLoading,
    updateAppPublicKeyState,
    updateAuthorizationState,
  ]);

  return <AppContext.Provider value={values}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
