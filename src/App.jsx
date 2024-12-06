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
const { Header, Content, Sider } = Layout;

import * as wobbegongapi from "./wobbegongapi.js";
import * as sewerratapi from "./searchapi.js";

const App = () => {
  const [tableData, setTableData] = useState(null);

  const onSearch = async (values) => {
    let results = await sewerratapi.findExperiments(
      values["query"],
      values["path"],
      20
    );

    setTableData(results);
  };
  const onSearchFailed = (errorInfo) => {
    setTableData([]);
  };

  const tableColumns = [{
    // title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Space size="middle">
        <a>Explore</a>
      </Space>
    ),
  },{
    title: 'Title',
    key: 'title',
    render: (_, record) => (
      record.metadata.title
    ),
    width: '20%',
  },{
    title: 'Description',
    key: 'description',
    render: (_, record) => (
      sewerratapi.truncate(record.metadata.description, 250)
    ),
    width: '70%',
  },{
    title: 'Path',
    key: 'path',
    render: (_, record) => (
      sewerratapi.breakString(record.path, 50)
    ),
    width: '10%',
  }]

  const tabItems = [
    {
      key: "1",
      label: "Find dataset",
      children: (
        <>
          <Content>
            <div>
              Wobbegong-kana is an extension of Kana's explore mode for
              pre-analyzed datasets. First lets find datasets of interest from
              LunaticDB.
            </div>

            <Form
              name="basic"
              labelCol={{
                span: 8,
              }}
              wrapperCol={{
                span: 16,
              }}
              style={{
                maxWidth: 600,
              }}
              initialValues={{
                remember: true,
              }}
              onFinish={onSearch}
              onFinishFailed={onSearchFailed}
              autoComplete="off"
            >
              <Form.Item
                label="Query keywords"
                name="query"
                initialValue="brain AND mouse"
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Collection"
                name="path"
                initialValue="vida_sc_data"
              >
                <Input />
              </Form.Item>

              <Form.Item label={null}>
                <Button type="primary" htmlType="submit">
                  Submit
                </Button>
              </Form.Item>
            </Form>
          </Content>

          {tableData !== null ? (
            <>
              {Array.isArray(tableData) && tableData.length > 0 ? (
                <Table dataSource={tableData} columns={tableColumns} />
              ) : (
                <div>No datasets available for this search.</div>
              )}
            </>
          ) : (
            <></>
          )}
        </>
      ),
      closable: false,
    },
  ];

  const [activeKey, setActiveKey] = useState(tabItems[0].key);
  const [items, setItems] = useState(tabItems);
  const newTabIndex = useRef(0);

  const onTabChange = (key) => {
    console.log(key);
  };

  const addTab = () => {
    const newActiveKey = `newTab${newTabIndex.current++}`;
    const newPanes = [...items];
    newPanes.push({
      label: "New Tab",
      children: "Content of new Tab",
      key: newActiveKey,
    });
    setItems(newPanes);
    setActiveKey(newActiveKey);
  };

  const removeTab = (targetKey) => {
    let newActiveKey = activeKey;
    let lastIndex = -1;
    items.forEach((item, i) => {
      if (item.key === targetKey) {
        lastIndex = i - 1;
      }
    });
    const newPanes = items.filter((item) => item.key !== targetKey);
    if (newPanes.length && newActiveKey === targetKey) {
      if (lastIndex >= 0) {
        newActiveKey = newPanes[lastIndex].key;
      } else {
        newActiveKey = newPanes[0].key;
      }
    }
    setItems(newPanes);
    setActiveKey(newActiveKey);
  };
  const onEdit = (targetKey, action) => {
    if (action === "add") {
      addTab();
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
          defaultActiveKey="1"
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
