import React, { useEffect, useState, useRef } from "react";
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
  Descriptions,
  Tag,
  Card,
  Collapse,
  Dropdown,
  Flex,
  Splitter,
  Typography,
  List,
} from "antd";
const { Header, Content, Sider } = Layout;
import { DatabaseTwoTone, DownOutlined } from "@ant-design/icons";

import * as wobbegongapi from "../utils/wobbegongapi.js";
import * as wb from "wobbegong";
import WebGLVis from "epiviz.gl";

import Rainbow from "../utils/rainbowvis.js";
import { randomColor } from "randomcolor";
import { defaultColor, getMinMax, getGradient } from "../utils/plotutils.js";
import { generateColors } from "../utils/colors.js";
import { SVGDimPlot } from "../utils/SVGDimPlot.js";

const Explorer = (props) => {
  const { record } = props;

  // marker related
  const [markerFiles, setMarkerFiles] = useState(null);
  const [markersConvertedFiles, setMarkersConvertedFiles] = useState(null);
  const [markersToExptMapping, setMarkersToExptMapping] = useState(null);

  // SCE object of the choosen dataset
  const [sce, setSce] = useState(null);

  // #### ROW DATA ####
  const [rowData, setRowData] = useState(null);
  // available row names
  const [rowNamesUI, setRowNamesUI] = useState(null);
  // user selected row name to display
  const [selectedRowNameUI, setSelectedRowNameUI] = useState(null);
  // rowdata to cache and plot
  const [rowdataCache, setRowdataCache] = useState({});

  // #### COLUMN DATA ####
  const [columnData, setColumnData] = useState(null);
  // available column names
  const [colNamesUI, setColNamesUI] = useState(null);
  // user selected column name to color by
  const [selectedColNameUI, setSelectedColNameUI] = useState(null);
  // coldata to cache and plot
  const [coldataCache, setColdataCache] = useState({});

  // #### EMBEDDINGS ####
  // available embeddings
  const [redDimNamesUI, setRedDimNamesUI] = useState(null);
  // user selected embedding
  const [selectedredDimNamesUI, setSelectedredDimNamesUI] = useState(null);
  // embedding to cache and plot
  const [embeddings, setEmbeddings] = useState({});

  // #### PLOT CONTAINER ####
  // ref to the plot dom container
  const embeddingContainer = useRef();
  // ref to the plot object
  const [scatterplot, setScatterplot] = useState(null);
  // flag to signal ready for plotting
  const [readyToPlot, setReadyToPlot] = useState(false);
  // plot color mappings for categorical/string columns
  const [plotIsGradient, setPlotIsGradient] = useState(null);
  const [plotColorMapper, setPlotColorMapper] = useState(null);
  const [plotColorGradient, setPlotColorGradient] = useState(null);
  const [plotColorGradientMinMax, setPlotColorGradientMinMax] = useState(null);

  // #### ASSAY ####
  const [assayNamesUI, setAssayNamesUI] = useState(null);
  const [selectedAssayNameUI, setSelectedAssayNameUI] = useState(null);
  const [normalizeUI, setNormalizeUI] = useState(null);

  const [assay, setAssay] = useState(null);
  const [expression, setExpression] = useState(null);

  useEffect(() => {
    // apparently a new way to call async functions within useEffects
    // to keep react happy

    // when the component is Loaded
    async function fetchData() {
      let markers = await wobbegongapi.findMarkerFiles(record.path);
      let conversion = await wobbegongapi.convertAllFiles(record.path, markers);
      let mapping = await wobbegongapi.matchMarkersToExperiment(
        conversion.path,
        conversion.markers
      );
      let sce = await wb.load(
        conversion.path,
        wobbegongapi.fetchJson,
        wobbegongapi.fetchRange
      );

      let row_data = await sce.rowData();
      if (row_data !== null) {
        let rnames = [];
        row_data.columnNames().forEach((x, i) => {
          rnames.push({ key: String(i), label: x });
        });
        setRowData(row_data);
        setRowNamesUI(rnames);
        setSelectedRowNameUI("0");
      }

      let column_data = await sce.columnData();
      if (column_data !== null) {
        let cnames = [];
        column_data.columnNames().forEach((x, i) => {
          cnames.push({ key: String(i), label: x });
        });
        setColumnData(column_data);
        setColNamesUI(cnames);
        setSelectedColNameUI("0");
      }

      let assay_names = await sce.assayNames();
      let chosen = wobbegongapi.chooseAssay(sce);

      if (assay_names !== null) {
        let asynames = [];
        let chosen_index = null;
        assay_names.forEach((x, i) => {
          asynames.push({ key: String(i), label: x });
          if (chosen.assay == x) {
            chosen_index = String(i);
          }
        });
        setAssayNamesUI(asynames);
        setSelectedAssayNameUI(chosen_index);
        setNormalizeUI(chosen.normalize);
      }

      let red_names = await sce.reducedDimensionNames();
      if (red_names !== null) {
        let rednames = [];
        red_names.forEach((x, i) => {
          rednames.push({ key: String(i), label: x });
        });
        setRedDimNamesUI(rednames);
        setSelectedredDimNamesUI("0");
      }
      setSce(sce);
    }

    fetchData();
  }, []);

  // when an column is selected
  useEffect(() => {
    async function fetchData() {
      const colKey = colNamesUI[parseInt(selectedColNameUI)]["label"];

      let output = await columnData.column(colKey, { type: true });

      let col_data = { ...coldataCache };
      col_data[colKey] = output;
      setColdataCache(col_data);
      setReadyToPlot(true);
    }

    if (sce !== null) {
      const colKey = colNamesUI[parseInt(selectedColNameUI)]["label"];

      if (!(colKey in coldataCache)) {
        fetchData();
      }
    }
  }, [selectedColNameUI]);

  // when an embedding is selected
  // only access the first two dimensions
  useEffect(() => {
    async function fetchData() {
      const embedKey = redDimNamesUI[parseInt(selectedredDimNamesUI)]["label"];

      let output = await sce.reducedDimension(embedKey);
      let firstdim = await output.column(0);
      let seconddim = await output.column(1);

      let new_embed = { ...embeddings };
      new_embed[embedKey] = { x: firstdim, y: seconddim };
      setEmbeddings(new_embed);
      setReadyToPlot(true);
    }

    if (sce !== null) {
      const embedKey = redDimNamesUI[parseInt(selectedredDimNamesUI)]["label"];

      if (!(embedKey in embeddings)) {
        fetchData();
      } else {
        setReadyToPlot(true);
      }
    }
  }, [selectedredDimNamesUI]);

  // When an Assay for selected
  useEffect(() => {
    // apparently a new way to call async functions within components
    // to keep react happy
    async function fetchData() {
      let ass = await sce.assay(
        assayNamesUI[parseInt(selectedAssayNameUI)]["label"]
      );
      let vals = await ass.row(0, { asDense: true });
      if (normalizeUI) {
        let sf = await wobbegongapi.computeSizeFactors(ass);
        console.log(sf);
        vals = wobbegongapi.normalizeCounts(vals, sf, true);
      }
      console.log(vals);
    }

    if (sce !== null) {
      fetchData();
    }
  }, [selectedAssayNameUI]);

  // useEffect(() => {
  //   // apparently a new way to call async functions within components
  //   // to keep react happy
  //   async function fetchData() {
  //     console.log(sce.reducedDimensionNames());
  //     let chosen = wobbegongapi.chooseAssay(sce);
  //     console.log(chosen);
  //     let ass = await sce.assay(chosen.assay);
  //     let vals = await ass.row(0, { asDense: true });
  //     if (chosen.normalize) {
  //       let sf = await wobbegongapi.computeSizeFactors(ass);
  //       console.log(sf);
  //       vals = wobbegongapi.normalizeCounts(vals, sf, true);
  //     }
  //     console.log(vals);
  //   }

  //   if (sce !== null) {
  //     fetchData();
  //   }
  // }, [sce]);

  // rendering the embedding plot

  useEffect(() => {
    const containerEl = embeddingContainer.current;

    if (containerEl && readyToPlot && sce !== null) {
      const embedKey = redDimNamesUI[parseInt(selectedredDimNamesUI)]["label"];

      let data = embeddings[embedKey];

      // if dimensions are available
      if (data) {
        let tmp_scatterplot = scatterplot;
        // only create the plot object once
        if (!tmp_scatterplot) {
          tmp_scatterplot = new WebGLVis(containerEl);
          tmp_scatterplot.addToDom();
          setScatterplot(tmp_scatterplot);
        }

        let plot_colors = [];
        const colKey = colNamesUI[parseInt(selectedColNameUI)]["label"];

        for (let i = 0; i < data.x.length; i++) {
          if (colKey in coldataCache) {
            const _col = coldataCache[colKey];
            if (_col.type == "string") {
              let uvals = [...new Set(_col.value)];
              let colors = generateColors(uvals.length);
              let color_mapper = {};
              for (let i = 0; i < _col.value.length; i++) {
                if (!(_col.value[i] in color_mapper)) {
                  color_mapper[_col.value[i]] =
                    colors[Object.keys(color_mapper).length];
                }

                plot_colors[i] = color_mapper[_col.value[i]];
              }
              setPlotIsGradient(false);
              setPlotColorMapper(color_mapper);
            } else if (
              _col.type == "number" ||
              _col.type == "integer" ||
              _col.type == "double"
            ) {
              let valMinMax = getMinMax(_col.value);
              let gradient = getGradient(valMinMax[0], valMinMax[1]);
              for (let i = 0; i < _col.value.length; i++) {
                plot_colors[i] = "#" + gradient.colorAt(_col.value[i]);
              }
              setPlotIsGradient(true);
              setPlotColorGradient(gradient);
              setPlotColorGradientMinMax(valMinMax);
            } else if (_col.type == "factor") {
              let colors = generateColors(_col.value.levels.length);
              let color_mapper = {};
              for (let i = 0; i < _col.value.levels.length; i++) {
                if (!(_col.value.levels[i] in color_mapper)) {
                  color_mapper[_col.value.levels[i]] =
                    colors[Object.keys(color_mapper).length];
                }
              }

              for (let i = 0; i < _col.value.codes.length; i++) {
                plot_colors[i] =
                  color_mapper[_col.value.levels[_col.value.codes[i]]];
              }
              setPlotIsGradient(false);
              setPlotColorMapper(color_mapper);
            }
          } else {
            plot_colors[i] = "#729ECE";
          }
        }

        let xMinMax = getMinMax(data.x);
        let yMinMax = getMinMax(data.y);
        let xDomain = [
          xMinMax[0] - Math.abs(0.25 * xMinMax[0]),
          xMinMax[1] + Math.abs(0.25 * xMinMax[1]),
        ];
        let yDomain = [
          yMinMax[0] - Math.abs(0.25 * yMinMax[0]),
          yMinMax[1] + Math.abs(0.25 * yMinMax[1]),
        ];

        let aspRatio = (containerEl.clientWidth / containerEl.clientHeight) | 1;

        let xBound = Math.max(...xDomain.map((a) => Math.abs(a)));
        let yBound = Math.max(...yDomain.map((a) => Math.abs(a)));

        if (aspRatio > 1) {
          xBound = xBound * aspRatio;
        } else {
          yBound = yBound / aspRatio;
        }

        let tspec = {
          defaultData: {
            x: data.x,
            y: data.y,
            color: plot_colors,
          },
          xAxis: "none",
          yAxis: "none",
          tracks: [
            {
              mark: "point",
              x: {
                attribute: "x",
                type: "quantitative",
                domain: [-xBound, xBound],
              },
              y: {
                attribute: "y",
                type: "quantitative",
                domain: [-yBound, yBound],
              },
              color: {
                attribute: "color",
                type: "inline",
              },
              size: { value: 3 },
              opacity: { value: 0.8 },
            },
          ],
        };

        function updatePlot() {
          let uspec = { ...tspec };

          tmp_scatterplot.setCanvasSize(
            containerEl.parentNode.clientWidth,
            containerEl.parentNode.clientHeight
          );

          aspRatio = (containerEl.clientWidth / containerEl.clientHeight) | 1;

          xBound = Math.max(...xDomain.map((a) => Math.abs(a)));
          yBound = Math.max(...yDomain.map((a) => Math.abs(a)));

          if (aspRatio > 1) {
            xBound = xBound * aspRatio;
          } else {
            yBound = yBound / aspRatio;
          }

          uspec["tracks"][0].x.domain = [-xBound, xBound];
          uspec["tracks"][0].y.domain = [-yBound, yBound];

          tmp_scatterplot.setSpecification(uspec);
        }

        if (window.scatterplotresizeObserver) {
          window.scatterplotresizeObserver.disconnect();
        }

        window.scatterplotresizeObserver = new ResizeObserver(() => {
          updatePlot();
        });

        window.scatterplotresizeObserver.observe(containerEl);
        tmp_scatterplot.setSpecification(tspec);

        setReadyToPlot(false);
      }
    }
  }, [readyToPlot, embeddings, selectedColNameUI, selectedredDimNamesUI]);

  function onRedDimSelectionChange(obj) {
    setSelectedredDimNamesUI(obj.key);
  }

  function onColNameSelectionChange(obj) {
    setSelectedColNameUI(obj.key);
  }

  function onAssaySelectionChange(obj) {
    setSelectedAssayNameUI(obj.key);
  }

  function onNomalizeUIChange(obj) {
    setNormalizeUI(obj.target.checked);
  }

  return (
    <Content>
      <Collapse
        size="small"
        items={[
          {
            key: "1",
            label: "Dataset Info",
            children: (
              <>
                {" "}
                <p>
                  <span>
                    <DatabaseTwoTone />
                    {"  " + record.metadata.title}
                  </span>
                </p>
                <p>{record.metadata.description}</p>
                <p>{record.path}</p>
                <p>something else</p>
              </>
            ),
          },
        ]}
      />
      {redDimNamesUI && sce && (
        <>
          Visualizing{" "}
          <Dropdown
            menu={{
              items: redDimNamesUI,
              selectable: true,
              defaultSelectedKeys: [selectedredDimNamesUI],
              onSelect: onRedDimSelectionChange,
            }}
            trigger={["click"]}
          >
            <a onClick={(e) => e.preventDefault()}>
              <Space>
                {redDimNamesUI[parseInt(selectedredDimNamesUI)]["label"]}
                <DownOutlined />
              </Space>
            </a>
          </Dropdown>
          , Color By{" "}
          <Dropdown
            menu={{
              items: colNamesUI,
              selectable: true,
              defaultSelectedKeys: [selectedColNameUI],
              onSelect: onColNameSelectionChange,
              style: {
                height: 300,
              },
            }}
            trigger={["click"]}
          >
            <a onClick={(e) => e.preventDefault()}>
              <Space>
                {colNamesUI[parseInt(selectedColNameUI)]["label"]}
                <DownOutlined />
              </Space>
            </a>
          </Dropdown>
        </>
      )}
      {assayNamesUI && sce && selectedAssayNameUI && (
        <>
          {" "}
          Explore assay:{" "}
          <Dropdown
            menu={{
              items: assayNamesUI,
              selectable: true,
              defaultSelectedKeys: [selectedAssayNameUI],
              onSelect: onAssaySelectionChange,
            }}
            trigger={["click"]}
          >
            <a onClick={(e) => e.preventDefault()}>
              <Space>
                {assayNamesUI[parseInt(selectedAssayNameUI)]["label"]}
                <DownOutlined />
              </Space>
            </a>
          </Dropdown>{" "}
          {normalizeUI !== null && (
            <Checkbox checked={normalizeUI} onChange={onNomalizeUIChange}>
              Normalize ?
            </Checkbox>
          )}
        </>
      )}
      <Flex gap="middle" vertical>
        <Splitter
          style={{
            // boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
            border: "1px solid gray",
            height: "calc(100vh - 250px)",
          }}
        >
          <Splitter.Panel min="30%">
            <Splitter layout="vertical">
              <Splitter.Panel defaultSize="75%">
                <Flex
                  justify="center"
                  align="center"
                  style={{
                    height: "100%",
                  }}
                >
                  <div
                    className="dim-plot"
                    style={{
                      width: "90%",
                      height: "90%",
                    }}
                  >
                    {embeddings ? (
                      <div
                        ref={embeddingContainer}
                        style={{
                          width: "100%",
                          height: "100%",
                        }}
                      ></div>
                    ) : (
                      "Choose an Embedding... or Embeddings are being fetched..."
                    )}
                  </div>
                </Flex>
              </Splitter.Panel>
              <Splitter.Panel defaultSize="100px" min="100px">
                <>
                  Legend
                  {plotIsGradient && scatterplot ? (
                    <>
                      <p>
                        Column{" "}
                        <Typography.Text keyboard>
                          {colNamesUI[parseInt(selectedColNameUI)]["label"]}
                        </Typography.Text>{" "}
                        is numerical, using a gradient
                        <Typography.Text code>
                          [min:{plotColorGradientMinMax[0]}, max:
                          {plotColorGradientMinMax[1]}]
                        </Typography.Text>
                      </p>
                      <div
                        style={{
                          backgroundImage: `linear-gradient(to right, #F5F8FA 0%, 50%, #2965CC 100%)`,
                          width: "145px",
                          height: "15px",
                          marginLeft: "4px",
                        }}
                      ></div>
                    </>
                  ) : (
                    <>
                      {plotColorMapper && (
                        <p>
                          Column{" "}
                          <Typography.Text keyboard>
                            {colNamesUI[parseInt(selectedColNameUI)]["label"]}
                          </Typography.Text>{" "}
                          contains{" "}
                          <Typography.Text>
                            {Object.keys(plotColorMapper).length}
                          </Typography.Text>{" "}
                          unique value{""}
                          {Object.keys(plotColorMapper).length > 1 ? "s:" : ":"}
                          <Flex wrap gap="small">
                            {Array.from(
                              Object.keys(plotColorMapper),
                              (item, i) => (
                                <Typography.Text
                                  key={i}
                                  style={{
                                    color: plotColorMapper[item],
                                  }}
                                >
                                  {item}
                                </Typography.Text>
                              )
                            )}
                          </Flex>
                        </p>
                      )}
                    </>
                  )}
                </>
              </Splitter.Panel>
            </Splitter>
          </Splitter.Panel>
          <Splitter.Panel min="20%">
            <Flex
              justify="center"
              align="center"
              style={{
                height: "100%",
              }}
            >
              Markers
            </Flex>
          </Splitter.Panel>
        </Splitter>
      </Flex>
    </Content>
  );
};

export default Explorer;
