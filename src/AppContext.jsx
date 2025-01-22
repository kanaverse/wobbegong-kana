import React, { createContext, useState } from "react";

export const AppContext = createContext(null);

const AppContextProvider = ({ children }) => {
  const [tableData, setTableData] = useState(null);

  return (
    <AppContext.Provider
      value={{
        tableData, setTableData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default React.memo(AppContextProvider);
