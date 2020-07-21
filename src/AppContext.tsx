import React, { useCallback, useMemo, useState } from "react";

export type AppContextType = {
  tableLoading: true;
  tableDataSource: any[];
  filteredDataSource: any[];
  setTableFilteredDataSource: (tableFilteredSource: any[]) => void;
  setTableLoading: (tableLoading: boolean) => void;
  setTableDataSource: (dataSource: any[]) => void;
  searchedTerm: string;
  setSearchedTerm: (searchedTerm: string) => void;
  setEditModal: (params: any) => void;
  editModal: { show: boolean; data: any };
  setAuthorizedAppsModal: (params: any) => void;
  authorizedAppsModal: { show: boolean; data: any };
};

const defaultValue: any = null;
export const AppContext = React.createContext<AppContextType>(defaultValue);

export function AppProvider({ children }: any) {
  const defaultParams: any = {
    searchedTerm: "",
  };

  const defaultParamstModal: { show: boolean; data: any } = {
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
  const [editModalState, setEditModalState] = useState(defaultParamstModal);
  const [authorizedAppsModalState, setAuthorizedAppsModalState] = useState(
    defaultParamstModal
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

  const setEditModal = useCallback(
    (editModal: any) => {
      setEditModalState({
        ...editModalState,
        ...editModal,
      });
    },
    [editModalState]
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
      authorizedAppsModal: authorizedAppsModalState,
      setTableLoading,
      setTableDataSource,
      setSearchedTerm,
      setTableFilteredDataSource,
      setEditModal,
      setAuthorizedAppsModal,
    };
  }, [appState, editModalState, tableDataState, authorizedAppsModalState]);

  return <AppContext.Provider value={props}>{children}</AppContext.Provider>;
}
