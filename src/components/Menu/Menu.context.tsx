import React, { createContext, ReactNode, useContext, useState } from "react";

type MenuContextType = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
};

const defaultValues: MenuContextType = {
  collapsed: false,
  setCollapsed: () => {},
};
export const MenuContext = createContext(defaultValues);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <MenuContext.Provider
      value={{
        collapsed,
        setCollapsed,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenuContext(): MenuContextType {
  return useContext(MenuContext);
}
