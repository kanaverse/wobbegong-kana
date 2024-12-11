import React, { useRef, useState } from "react";
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
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
const { Header, Content, Sider } = Layout;

import Explorer from "./TabComps/Explorer.jsx";
import Search from "./TabComps/Search.jsx";

const App = () => {
  const addNewTab = (record) => {
    // const newActiveKey = `newTab${newTabIndex.current++}`;
    console.log(items);
    const newPanes = [...items];
    newPanes.push({
      label: "Explore " + record.metadata.title,
      children: <Explorer record={record} />,
      key: record.path,
    });
    setItems(newPanes);
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
      children: <Search addTabCallback={addNewTab} />,
    },
  ];

  const [activeKey, setActiveKey] = useState(defaultPanes[0].key);
  const [items, setItems] = useState(defaultPanes);
  const newTabIndex = useRef(0);

  const removeTab = (targetKey) => {
    const targetIndex = items.findIndex((pane) => pane.key === targetKey);
    const newPanes = items.filter((pane) => pane.key !== targetKey);
    if (newPanes.length && targetKey === activeKey) {
      const { key } =
        newPanes[
          targetIndex === newPanes.length ? targetIndex - 1 : targetIndex
        ];
      setActiveKey(key);
    }
    setItems(newPanes);
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
        }}
      >
        <div>wobbegong-demo</div>
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
          items={items}
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
