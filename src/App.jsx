import React, { useRef, useState, useContext, useEffect } from "react";
import {
  Breadcrumb,
  Layout,
  Menu,
  Tabs,
  theme,
  Input,
  Form,
  Button,
  Checkbox,
  Table,
  Space,
  notification,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
const { Header, Content, Sider } = Layout;

import Explorer from "./TabComps/Explorer.jsx";
import Search from "./TabComps/Search.jsx";
// import { AppContext } from "./AppContext.jsx";

const App = () => {
  const [addToExplore, setAddToExplore] = useState(null);

  useEffect(() => {
    if (addToExplore !== null) {
      addNewTab(addToExplore);
      setAddToExplore(null);
    }
  }, [addToExplore]);

  const addNewTab = (record) => {
    // const newActiveKey = `newTab${newTabIndex.current++}`;

    const newPanes = [...tabItems];
    newPanes.push({
      label: "Explore " + record.metadata.title,
      children: <Explorer record={record} />,
      key: record.path,
    });
    setTabItems(newPanes);
    setActiveKey(record.path);
  };

  const onTabChange = (key) => {
    setActiveKey(key);
  };

  const defaultPanes = [
    {
      key: "findDataset",
      label: "Find dataset",
      closable: false,
      icon: <SearchOutlined />,
      children: <Search setAddToExplore={setAddToExplore} />,
    },
  ];

  const [activeKey, setActiveKey] = useState(defaultPanes[0].key);
  const [tabItems, setTabItems] = useState(defaultPanes);
  const newTabIndex = useRef(0);

  const removeTab = (targetKey) => {
    const targetIndex = tabItems.findIndex((pane) => pane.key === targetKey);
    const newPanes = tabItems.filter((pane) => pane.key !== targetKey);
    if (newPanes.length && targetKey === activeKey) {
      const { key } =
        newPanes[
          targetIndex === newPanes.length ? targetIndex - 1 : targetIndex
        ];
      setActiveKey(key);
    }
    setTabItems(newPanes);
  };

  const onEdit = (targetKey, action) => {
    if (action === "add") {
      // do nothing
    } else {
      removeTab(targetKey);
    }
  };

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#f4f4f4"
        }}
      >
        <h2>
          Search <a href="https://github.roche.com/GP/LunaticDB">LunaticDB</a>{" "}
          for interesting single-cell datasets
        </h2>
      </Header>
      <Content
        style={{
          padding: 24,
          margin: 0,
          minHeight: 280,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}
      >
        <Tabs
          type="editable-card"
          items={tabItems}
          onChange={onTabChange}
          tabPosition="top"
          activeKey={activeKey}
          onEdit={onEdit}
          hideAdd
        />
      </Content>
    </Layout>
  );
};

export default App;
