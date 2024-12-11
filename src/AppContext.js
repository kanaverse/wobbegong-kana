import React, { createContext, useState } from "react";

export const AppContext = createContext(null);

const AppContextProvider = ({ children }) => {
  const [tabItems, setTabItems] = useState(null);

  return (
    <AppContext.Provider
      value={{
        tabItems,
        setTabItems,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default React.memo(AppContextProvider);
