import React, {
  createContext,
  ReactElement,
  useContext,
  useState,
} from "react";
import { DEFAULT_PAGE } from "../TrustedShemasRegistry/constants";
import { PolicyTableItem, UserTableRow, UserAttributeRow } from "./types";

type PoliciesUserContextType = {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  page: number;
  attributesPage: number;
  setPage: (page: number) => void;
  setAttributesPage: (attrPage: number) => void;
  totalItems: number;
  totalAttributes: number;
  setTotalItems: (totalItems: number) => void;
  attributes: UserAttributeRow[];
  setAttributes: (attributes: UserAttributeRow[]) => void;
  setTotalAttributes: (totalAttributes: number) => void;
  users: PolicyTableItem[];
  setUsers: (users: UserTableRow[]) => void;
  attributesLoading: boolean;
  setAttributesLoading: (loading: boolean) => void;
};

const DEFAULT_USERS: UserTableRow[] = [];
const DEFAULT_ATTRIBUTES: UserAttributeRow[] = [];

export const PoliciesUserContext = createContext<PoliciesUserContextType>({
  page: 1,
  setPage: () => {},
  loading: false,
  setLoading: () => {},
  totalItems: 0,
  totalAttributes: 0,
  setTotalItems: () => {},
  setTotalAttributes: () => {},
  users: [],
  attributes: [],
  setUsers: () => {},
  setAttributes: () => {},
  attributesPage: 1,
  setAttributesPage: () => {},
  attributesLoading: false,
  setAttributesLoading: () => {},
});

export default function PoliciesUsersContextProvider({
  children,
}: {
  children: ReactElement[] | ReactElement;
}): ReactElement {
  // Users
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [totalItems, setTotalItems] = useState(0);

  // Attributes
  const [attributes, setAttributes] = useState(DEFAULT_ATTRIBUTES);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [attributesPage, setAttributesPage] = useState(DEFAULT_PAGE);
  const [totalAttributes, setTotalAttributes] = useState(0);

  return (
    <PoliciesUserContext.Provider
      value={{
        loading,
        setLoading,
        page,
        setPage,
        users,
        setUsers,
        totalItems,
        setTotalItems,
        attributes,
        setTotalAttributes,
        totalAttributes,
        setAttributes,
        attributesPage,
        setAttributesPage,
        attributesLoading,
        setAttributesLoading,
      }}
    >
      {children}
    </PoliciesUserContext.Provider>
  );
}

export function useTrustedPoliciesUsersContext() {
  return useContext(PoliciesUserContext);
}
