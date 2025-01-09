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
  notification,
} from "antd";
const { Header, Content, Sider } = Layout;

import * as wobbegongapi from "./wobbegongapi.js";
import * as sewerratapi from "./searchapi.js";
import * as wob from "wobbegong";

const App = () => {
  const [tableData, setTableData] = useState(null);
  const [api, contextHolder] = notification.useNotification();

  const onSearch = async (values) => {
    const limit = 100;
    let results = await sewerratapi.findExperiments(
      values["query"],
      values["path"],
      limit + 1
    );

    console.log(results.length);
    if (results.length > limit) {
      api.info({
        message: `Truncated search to the first ${limit} results.`,
        placement: "topRight",
      });
      results = results.slice(0, limit);
    }

    setTableData(results);
  };
  const onSearchFailed = (errorInfo) => {
    setTableData([]);
  };

  const tableColumns = [{
    title: 'Title',
    key: 'title',
    render: (_, record) => (
      record.metadata.title
    ),
    width: '30%',
  },{
    title: 'Path',
    key: 'path',
    render: (_, record) => (
      <code>{sewerratapi.truncateString(record.path, 100)}</code>
    ),
    width: '30%',
  },{
    title: 'Authors',
    key: 'authors',
    render: (_, record) => {
      let aut = record.metadata?.authors;
      if (typeof aut == "undefined") {
        return "";
      } else {
        return aut.join(", ");
      }
    },
  },{
    title: 'Number of cells',
    key: 'num_cells',
    render: (_, record) => {
      let ncols = record.metadata?.object?.summarized_experiment?.columns;
      if (typeof ncols == "undefined") {
        return "unknown";
      } else {
        return ncols;
      }
    },
  },{
    title: 'Assays',
    key: 'red_dims',
    render: (_, record) => {
      let rd = record.metadata?.object?.summarized_experiment?.assays;
      if (typeof rd == "undefined") {
        return "";
      } else {
        return rd.join(", ");
      }
    },
  },{
    title: 'Reduced dimensions',
    key: 'red_dims',
    render: (_, record) => {
      let rd = record.metadata?.object?.single_cell_experiment?.reduced_dimensions;
      if (typeof rd == "undefined") {
        return "";
      } else {
        return rd.join(", ");
      }
    },
  },{
    title: 'Actions',
    key: 'explore',
    render: (_, record) => (
      <span>
      <Button type="primary"
        onClick={async e => {
          let markers = await wobbegongapi.findMarkerFiles(record.path);
          console.log(markers);
          let conversion = await wobbegongapi.convertAllFiles(record.path, markers);
          console.log(conversion);
          let mapping = await wobbegongapi.matchMarkersToExperiment(conversion.path, conversion.markers);
          console.log(mapping);
          let sce = await wob.load(conversion.path, wobbegongapi.fetchJson, wobbegongapi.fetchRange);
          let chosen = wobbegongapi.chooseAssay(sce);
          console.log(chosen);
          let ass = await sce.assay(chosen.assay);
          let vals = await ass.row(0, { asDense: true });
          if (chosen.normalize) {
            let sf = await wobbegongapi.computeSizeFactors(ass);
            console.log(sf);
            vals = await wobbegongapi.normalizeCounts(vals, sf, true);
          }
          console.log(vals);
        }}
        >Explore</Button>
      &nbsp;
      <Button 
        onClick={e => {
          e.preventDefault();
          navigator.clipboard.writeText(record.path);
          api.info({
            message: `Copied path to clipboard!`,
            placement: "top",
          });
        }}
      >Copy path</Button>
      </span>
    ),
    width: '10%'
  }]

  const tabItems = [
    {
      key: "1",
      label: "Search",
      children: (
        <>
          <Content>
            <p>
            </p>
            <p>
              For metadata queries, we can use <code>AND</code>, <code>OR</code>, and <code>NOT</code> along with parentheses,
              e.g., <code>(mouse OR rat) AND pancreas AND NOT mm9</code> will find mouse or rat pancreas entries that do not have mm9 in its metadata.
              Partial searches can be performed by specifying the <code>*</code> or <code>?</code> wildcards.
              Advanced users can also scope the search for terms to specific metadata fields,
              e.g., <code>genome: GRCm38</code> will only match when GRCm38 is present in the <code>genome</code> field.
            </p>

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
                label="Search metadata"
                name="query"
              >
                <Input 
                  placeholder="brain AND mouse"
                />
              </Form.Item>

              <Form.Item
                label="Filter by path"
                name="path"
              >
                <Input
                  placeholder="vida_sc_data"
                />
              </Form.Item>

              <Form.Item label={null}>
                <Button type="primary" htmlType="submit">
                  Submit
                </Button>
              </Form.Item>
            </Form>
          </Content>

          {contextHolder}
          {tableData !== null ? (
            <>
              {Array.isArray(tableData) && tableData.length > 0 ? (
                <Table dataSource={tableData} columns={tableColumns} style={{wordWrap:"break-word"}} />
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
        <h2>Search <a href="https://github.roche.com/GP/LunaticDB">LunaticDB</a> for interesting single-cell datasets</h2>
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
