import React, { useCallback, useEffect, useMemo, useState } from "react";

export type AppContextType = {
  tableLoading: true;
  tableDataSource: any[];
  filteredDataSource: any[];
  setTableFilteredDataSource: (tableFilteredSource: any[]) => void;
  setTableLoading: (tableLoading: boolean) => void;
  setTableDataSource: (dataSource: any[]) => void;
  searchedTerm: string;
  page: number;
  setSearchedTerm: (searchedTerm: string) => void;
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
};

const defaultValue: any = {};
export const AppContext = React.createContext<AppContextType>(defaultValue);

export function AppProvider({ children }: any) {
  const defaultParams: any = {
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
  const [insertPublicKeyModalState, setInsertPublicKeyModalState] = useState(
    defaultParamsModal
  );
  const [authorizedAppsModalState, setAuthorizedAppsModalState] = useState(
    defaultParamsModal
  );
  const [updateAppPublicKeyState, setUpdateAppPublicKeyState] = useState(
    defaultParamsModal
  );

  const [updateAuthorizationState, setUpdateAuthorizationState] = useState(
    defaultParamsModal
  );

  const basePageErr: string = "";

  const [pageErr, setPageErr] = useState(basePageErr);
  const [metamask, setMetamask] = useState();

  useEffect(() => {
    const Window: any = window;

    if (!Window?.ethereum) {
      setPageErr("Please install MetaMask first.");
    }

    if (!metamask) {
      if (Window?.ethereum) {
        setMetamask(Window.ethereum);
      }
      Window?.ethereum
        .enable()
        .then(() => {
          setMetamask(Window.ethereum);
        })
        .catch(() => {
          setPageErr("You need to allow MetaMask.");
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

  const setTableLoading = useCallback(
    (tableLoading) => {
      setTableDataState({
        ...tableDataState,
        tableLoading,
      });
    },
    [tableDataState]
  );

  const setTableDataSource = useCallback(
    (tableDataSource: any[]) => {
      setTableDataState({
        ...tableDataState,
        tableDataSource,
        filteredDataSource: tableDataSource,
        tableLoading: false,
      });
    },
    [tableDataState]
  );

  const setTableFilteredDataSource = useCallback(
    (filteredDataSource: any[]) => {
      setTableDataState({
        ...tableDataState,
        filteredDataSource,
        tableLoading: false,
      });
    },
    [tableDataState]
  );

  const setSearchedTerm = useCallback(
    (searchedTerm: string) => {
      setAppState({
        ...appState,
        searchedTerm,
      });
    },
    [appState]
  );

  const setPage = useCallback(
    (page: number) => {
      setAppState({
        ...appState,
        page,
      });
    },
    [appState]
  );

  const setEditModal = useCallback(
    (editModal: any) => {
      setEditModalState({
        ...editModalState,
        ...editModal,
      });
    },
    [editModalState]
  );

  const setInsertPublicKeyModal = useCallback(
    (insertPubKeyModal: any) => {
      setInsertPublicKeyModalState({
        ...insertPublicKeyModalState,
        ...insertPubKeyModal,
      });
    },
    [insertPublicKeyModalState]
  );

  const setAuthorizedAppsModal = useCallback(
    (authorizedAppsModal: any) => {
      setAuthorizedAppsModalState({
        ...authorizedAppsModalState,
        ...authorizedAppsModal,
      });
    },
    [authorizedAppsModalState]
  );

  const props: any = useMemo(() => {
    return {
      ...appState,
      ...tableDataState,
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
    };
  }, [
    appState,
    editModalState,
    setInsertPublicKeyModal,
    tableDataState,
    setPage,
    authorizedAppsModalState,
    updateAppPublicKeyState,
    updateAuthorizationState,
    updateAuthorizationState,
    metamask,
  ]);

  return <AppContext.Provider value={props}>{children}</AppContext.Provider>;
}
