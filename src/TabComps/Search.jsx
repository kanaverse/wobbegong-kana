import React, { useRef, useState, useContext } from "react";
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
  Flex,
} from "antd";
const { Header, Content, Sider } = Layout;

import * as wobbegongapi from "../utils/wobbegongapi.js";
import * as wb from "wobbegong";
// import { AppContext } from "../AppContext.jsx";

const Search = (props) => {
  // const { tableData, setTableData } = useContext(AppContext);
  const [tableData, setTableData] = useState(null);
  const onSearch = async (values) => {
    let results = await wobbegongapi.findExperiments(
      values["query"],
      values["path"],
      20
    );

    results.forEach((n,i) => {
      n["key"] = i
    })

    setTableData(results);
  };
  const onSearchFailed = (errorInfo) => {
    setTableData([]);
  };

  const tableColumns = [
    {
      title: "Title",
      key: "title",
      render: (_, record) => record.metadata.title,
      width: "30%",
    },
    Table.EXPAND_COLUMN,
    {
      title: "Authors",
      key: "authors",
      render: (_, record) => {
        let aut = record.metadata?.authors;
        if (typeof aut == "undefined") {
          return "";
        } else {
          return aut.join(", ");
        }
      },
    },
    {
      title: "Number of cells",
      key: "num_cells",
      render: (_, record) => {
        let ncols = record.metadata?.object?.summarized_experiment?.columns;
        if (typeof ncols == "undefined") {
          return "unknown";
        } else {
          return ncols;
        }
      },
    },
    {
      title: "Assays",
      key: "red_dims",
      render: (_, record) => {
        let rd = record.metadata?.object?.summarized_experiment?.assays;
        if (typeof rd == "undefined") {
          return "";
        } else {
          return rd.join(", ");
        }
      },
    },
    {
      title: "Reduced dimensions",
      key: "red_dims",
      render: (_, record) => {
        let rd =
          record.metadata?.object?.single_cell_experiment?.reduced_dimensions;
        if (typeof rd == "undefined") {
          return "";
        } else {
          return rd.join(", ");
        }
      },
    },
    {
      title: "Actions",
      key: "explore",
      render: (_, record) => (
        <Flex gap="small" wrap>
          <Button
            type="primary"
            onClick={async (e) => {
              let markers = await wobbegongapi.findMarkerFiles(record.path);
              console.log(markers);
              let conversion = await wobbegongapi.convertAllFiles(
                record.path,
                markers
              );
              console.log(conversion);
              let mapping = await wobbegongapi.matchMarkersToExperiment(
                conversion.path,
                conversion.markers
              );
              console.log(mapping);
              let sce = await wb.load(
                conversion.path,
                wobbegongapi.fetchJson,
                wobbegongapi.fetchRange
              );
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
          >
            Explore
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              navigator.clipboard.writeText(record.path);
              api.info({
                message: `Copied path to clipboard!`,
                placement: "top",
              });
            }}
          >
            Copy path
          </Button>
        </Flex>
      ),
      width: "10%",
    },
  ];

  function render_search_results() {
    console.log(tableData);

    return (
      <>
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
    );
  }

  return (
    <>
      <Content>
        <p></p>
        <p>
          For metadata queries, we can use <code>AND</code>, <code>OR</code>,
          and <code>NOT</code> along with parentheses, e.g.,{" "}
          <code>(mouse OR rat) AND pancreas AND NOT mm9</code> will find mouse
          or rat pancreas entries that do not have mm9 in its metadata. Partial
          searches can be performed by specifying the <code>*</code> or{" "}
          <code>?</code> wildcards. Advanced users can also scope the search for
          terms to specific metadata fields, e.g., <code>genome: GRCm38</code>{" "}
          will only match when GRCm38 is present in the <code>genome</code>{" "}
          field.
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
          <Form.Item label="Search metadata" name="query">
            <Input placeholder="brain AND mouse" />
          </Form.Item>

          <Form.Item label="Filter by path" name="path">
            <Input placeholder="vida_sc_data" />
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
            <Table
              dataSource={tableData}
              columns={tableColumns}
              style={{ wordWrap: "break-word" }}
              expandable={{
                expandedRowRender: (record) => (
                  <p
                    style={{
                      margin: 0,
                    }}
                  >
                    <span>
                      <strong>Description:</strong>{" "}
                      {record.metadata.description}
                    </span>
                    <br />
                    <span>
                      <strong>Path:</strong> {record.path}
                    </span>
                  </p>
                ),
              }}
            />
          ) : (
            <div>No datasets available for this search.</div>
          )}
        </>
      ) : (
        <></>
      )}
    </>
  );
};

export default Search;
