import React, {
  createContext,
  ReactElement,
  useContext,
  useState,
} from "react";
import { Form, FormInstance } from "antd";
import { DEFAULT_PAGE } from "../TrustedShemasRegistry/constants";
import { PolicyTableItem } from "./types";

type PoliciesContextType = {
  insertNewPolicyForm?: FormInstance;
  editNewPolicyForm?: FormInstance;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  page: number;
  setPage: (page: number) => void;
  totalItems: number;
  setTotalItems: (totalItems: number) => void;
  policies: PolicyTableItem[];
  setPolicies: (policies: PolicyTableItem[]) => void;
};

const DEFAULT_POLICIES: PolicyTableItem[] = [];

export const PoliciesContext = createContext<PoliciesContextType>({
  page: 1,
  setPage: () => {},
  loading: false,
  setLoading: () => {},
  totalItems: 0,
  setTotalItems: () => {},
  policies: [],
  setPolicies: () => {},
});

export default function PoliciesContextProvider({
  children,
}: {
  children: ReactElement[] | ReactElement;
}): ReactElement {
  const [insertNewPolicyForm] = Form.useForm();
  const [editNewPolicyForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [policies, setPolicies] = useState(DEFAULT_POLICIES);
  const [totalItems, setTotalItems] = useState(0);

  return (
    <PoliciesContext.Provider
      value={{
        insertNewPolicyForm,
        editNewPolicyForm,
        loading,
        setLoading,
        page,
        setPage,
        policies,
        setPolicies,
        totalItems,
        setTotalItems,
      }}
    >
      {children}
    </PoliciesContext.Provider>
  );
}

export function useTrustedPoliciesContext() {
  return useContext(PoliciesContext);
}
