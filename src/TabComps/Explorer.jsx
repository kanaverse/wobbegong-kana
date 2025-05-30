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
const { Column, ColumnGroup } = Table;

import {
  DatabaseTwoTone,
  DownOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import * as wobbegongapi from "../utils/wobbegongapi.js";
import * as wb from "wobbegong";
import WebGLVis from "epiviz.gl";

import Rainbow from "../utils/rainbowvis.js";
import { randomColor } from "randomcolor";
import {
  defaultColor,
  getMinMax,
  getGradient,
  sortWithIndices,
  sortArrayByIndices,
} from "../utils/plotutils.js";
import { generateColors } from "../utils/colors.js";
import { SVGDimPlot } from "../utils/SVGDimPlot.js";

const Explorer = (props) => {
  const { record } = props;

  // SCE object of the choosen dataset
  const [sce, setSce] = useState(null);

  // #### ROW DATA ####
  const [rowData, setRowData] = useState(null);
  // available row names
  const [rowNamesUI, setRowNamesUI] = useState(null);
  // user selected row names to display
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

  // #### MODALITY ####
  const [selectedModality, setSelectedModality] = useState("");

  // #### ASSAY ####
  const [assayNamesUI, setAssayNamesUI] = useState(null);
  const [selectedAssayNameUI, setSelectedAssayNameUI] = useState(null);
  const [normalizeUI, setNormalizeUI] = useState(null);

  const [assay, setAssay] = useState(null);
  const [expression, setExpression] = useState(null);

  // #### MARKERS ####

  // marker search
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef(null);
  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };
  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText("");
  };
  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
      close,
    }) => (
      <div
        style={{
          padding: 8,
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{
            marginBottom: 8,
            display: "block",
          }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{
              width: 90,
            }}
          >
            Search
          </Button>
          {/* <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{
              width: 90,
            }}
          >
            Reset
          </Button> */}
          <Button
            type="link"
            size="small"
            onClick={() => {
              clearFilters && handleReset(clearFilters);
              confirm({
                closeDropdown: false,
              });
              setSearchText(selectedKeys[0]);
              setSearchedColumn(dataIndex);
            }}
          >
            Reset
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
            close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined
        style={{
          color: filtered ? "#1677ff" : undefined,
        }}
      />
    ),
    onFilter: (value, record) =>
      record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()),
    filterDropdownProps: {
      onOpenChange(open) {
        if (open) {
          setTimeout(() => searchInput.current?.select(), 100);
        }
      },
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{
            backgroundColor: "#ffc069",
            padding: 0,
          }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ""}
        />
      ) : (
        text
      ),
  });

  // flag to signal ready for table
  const [readyToTable, setReadyToTable] = useState(false);
  // marker related
  const [markerFiles, setMarkerFiles] = useState(null);
  const [markersConvertedFiles, setMarkersConvertedFiles] = useState(null);
  const [markersToExptMapping, setMarkersToExptMapping] = useState(null);
  // marker table data - this is just rowdata
  const [markerData, setMarkerData] = useState([]);
  const [markerDataColumns, setMarkerDataColumns] = useState([
    {
      title: "rownames",
      key: "rowname",
      dataIndex: "rowname",
      ...getColumnSearchProps("rowname"),
      fixed: "left",
      width: 100,
    },
  ]);

  const [markerDataToShow, setMarkerDataToShow] = useState(null);
  const [markerDataColumnsToShow, setMarkerDataColumnsToShow] = useState(null);

  // ref to the dom
  const markerTableRef = React.useRef(null);
  // setting in params for height and width of the virtual scroll
  const [markerTableUIScroll, setMarkerTableUIScroll] = useState({
    x: 2000,
    y: 500,
  });
  // selected gene
  const [markerTableSelection, setMarkerTableSelection] = useState(null);

  const [markerItemsUI, setMarkerItemsUI] = useState([
    {
      key: "rowdata",
      label: "rowdata",
    },
  ]);
  const [selectedMarkerUI, setSelectedMarkerUI] = useState(null);

  useEffect(() => {
    // apparently a new way to call async functions within useEffects
    // to keep react happy

    // when the component is Loaded
    async function fetchData() {
      let parent_path = wobbegongapi.getParent(record.path);
      let markers = await wobbegongapi.findMarkerFiles(parent_path);
      setMarkerFiles(markers);

      let _markersui = [...markerItemsUI];
      for (const m of markers[selectedModality]) {
        _markersui.push({
          key: m,
          label: m,
        });
      }

      setMarkerItemsUI(_markersui);
      // let markers2 = await wobbegongapi.findMarkers(record.path);
      let conversion = await wobbegongapi.convertAllFiles(parent_path, markers);
      setMarkersConvertedFiles(conversion);
      let mapping = await wobbegongapi.matchMarkersToExperiment(
        conversion.path,
        conversion.markers
      );
      setMarkersToExptMapping(mapping);

      let sce = await wb.load(
        conversion.path,
        wobbegongapi.fetchJson,
        wobbegongapi.fetchRange
      );

      let row_data = await sce.rowData();
      if (row_data !== null) {
        let rnames = [];
        let _extra_columns = [...markerDataColumns];

        rnames.push({ key: String(0), label: "rownames" });
        row_data.columnNames().forEach((x, i) => {
          rnames.push({ key: String(i + 1), label: x });
          _extra_columns.push({ key: x, title: x, dataIndex: x });
        });

        let rownamedata = await row_data.rowNames();
        let r_data = { ...rowdataCache };
        r_data["rownames"] = rownamedata;
        setRowdataCache(r_data);

        let _mdata = [];
        for (let i = 0; i < rownamedata.length; i++) {
          _mdata.push({
            key: i,
            rowname: rownamedata[i],
          });
        }

        for (const _xcol of row_data.columnNames()) {
          const _colvalues = await row_data.column(_xcol);
          for (let i = 0; i < rownamedata.length; i++) {
            _mdata[i][_xcol] = _colvalues[i];
          }
        }
        setMarkerData(_mdata);
        // _extra_columns.push({
        //   title: "Action",
        //   key: "operation",
        //   fixed: "right",
        //   width: 100,
        //   render: (_, record) => {
        //     if ("_uiselected" in record && record[_uiselected] == true) {
        //       return (
        //         <a onClick={() => deselectRowInMarker(record.key)}>
        //           {" "}
        //           Clear Gene
        //         </a>
        //       );
        //     } else {
        //       return (
        //         <a onClick={() => selectRowInMarker(record.key)}>
        //           {" "}
        //           Select Gene
        //         </a>
        //       );
        //     }
        //   },
        // });
        setMarkerDataColumns(_extra_columns);
        setSelectedMarkerUI("rowdata");

        setMarkerTableUIScroll({
          x: 2000, //markerTableRef.current.parentElement.clientWidth - 15,
          y: markerTableRef.current.parentElement.clientHeight - 90,
        });

        if (window.markertableObserver) {
          window.markertableObserver.disconnect();
        }

        window.markertableObserver = new ResizeObserver(() => {
          setMarkerTableUIScroll({
            x: 2000, //markerTableRef.current.parentElement.clientWidth - 15,
            y: markerTableRef.current.parentElement.clientHeight - 90,
          });
        });

        window.markertableObserver.observe(
          markerTableRef.current.parentElement
        );

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
      } else {
        setReadyToPlot(true);
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
      setAssay(ass);
    }

    if (sce !== null) {
      fetchData();
    }
  }, [selectedAssayNameUI]);

  // when a gene is selected
  useEffect(() => {
    async function fetchData() {
      if (assay !== null && markerTableSelection !== null) {
        let vals = await assay.row(markerTableSelection, { asDense: true });
        if (normalizeUI) {
          let sf = await wobbegongapi.computeSizeFactors(assay);
          vals = wobbegongapi.normalizeCounts(vals, sf, true);
        }

        setExpression(vals);
        setReadyToPlot(true);
      }
    }

    if (sce !== null) {
      fetchData();
    }
  }, [markerTableSelection, assay, normalizeUI]);

  // When a Marker is selected
  useEffect(() => {
    // apparently a new way to call async functions within components
    // to keep react happy
    async function fetchData() {
      if (selectedMarkerUI == "rowdata") {
        setMarkerDataToShow(markerData);
        setMarkerDataColumnsToShow(markerDataColumns);
      } else {
        const _indexofselection =
          markerFiles[selectedModality].indexOf(selectedMarkerUI);
        const _convertedFilePath =
          markersConvertedFiles["markers"][selectedModality][_indexofselection];

        let _marker_data = await wobbegongapi.getMarker(_convertedFilePath);

        let _marker_names = [];
        let _marker_extra_columns = [...markerDataColumnsToShow];
        const all_names = markerDataColumnsToShow.map((x) => x.key);
        _marker_data.columnNames().forEach((x, i) => {
          if (all_names.indexOf(x) == -1) {
            _marker_extra_columns.push({ key: x, title: x, dataIndex: x });
          }
        });

        let _marker_row_names = await _marker_data.rowNames();
        const marker_index_to_row_data = wobbegongapi.mapNames(
          _marker_row_names,
          markerData.map((x) => x["rowname"])
        );

        let _row_data_with_marker_metrics = [...markerDataToShow];

        for (const _xcol of _marker_data.columnNames()) {
          if (all_names.indexOf(_xcol) == -1) {
            const _colvalues = await _marker_data.column(_xcol);
            for (let i = 0; i < marker_index_to_row_data.length; i++) {
              _row_data_with_marker_metrics[marker_index_to_row_data[i]][
                _xcol
              ] = _colvalues[i];
            }
          }
        }

        // reorder row_Data to the order from the marker file
        let _reordered_marker_metrics = [];
        for (const idc of marker_index_to_row_data) {
          _reordered_marker_metrics.push(_row_data_with_marker_metrics[idc]);
        }
        setMarkerDataToShow(_reordered_marker_metrics);
        setMarkerDataColumnsToShow(_marker_extra_columns);
      }
    }

    if (sce !== null && selectedMarkerUI !== null) {
      fetchData();
    }
  }, [selectedMarkerUI, sce]);

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

  useEffect(() => {
    async function fetchData() {
      const rowKey = rowNamesUI[parseInt(selectedRowNameUI)]["label"];

      let output = await rowData.column(rowKey, { type: true });

      let row_data = { ...rowdataCache };
      row_data[rowKey] = output;
      setRowdataCache(row_data);
      setReadyToTable(true);
    }

    if (sce !== null) {
      const rowKey = rowNamesUI[parseInt(selectedRowNameUI)]["label"];

      if (!(rowKey in rowdataCache)) {
        fetchData();
      } else {
        setReadyToTable(true);
      }
    }
  }, [markerFiles, markersConvertedFiles, markersToExptMapping]);

  // when a row columnname changes
  useEffect(() => {
    async function fetchData() {
      const rowKey = rowNamesUI[parseInt(selectedRowNameUI)]["label"];

      let output = await rowData.column(rowKey, { type: true });

      let row_data = { ...rowdataCache };
      row_data[rowKey] = output;
      setRowdataCache(row_data);
      setReadyToTable(true);
    }

    if (sce !== null) {
      const rowKey = rowNamesUI[parseInt(selectedRowNameUI)]["label"];

      if (!(rowKey in rowdataCache)) {
        fetchData();
      } else {
        setReadyToTable(true);
      }
    }
  }, [selectedRowNameUI]);

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
        let sort_order = null;

        if (expression !== null) {
          let valMinMax = getMinMax(expression);
          let gradient = getGradient(valMinMax[0], valMinMax[1]);
          sort_order = sortWithIndices(expression);

          for (let i = 0; i < expression.length; i++) {
            plot_colors[i] = "#" + gradient.colorAt(expression[i]);
          }
          setPlotIsGradient(true);
          setPlotColorGradient(gradient);
          setPlotColorGradientMinMax(valMinMax);
        } else if (colKey in coldataCache) {
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

            sort_order = sortWithIndices(_col.value);

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
          for (let i = 0; i < data.x.length; i++) {
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

        let sorted_plot_colors, sorted_data_x, sorted_data_y;
        if (sort_order !== null) {
          sorted_data_x = sortArrayByIndices(data.x, sort_order.indices);
          sorted_data_y = sortArrayByIndices(data.y, sort_order.indices);
          sorted_plot_colors = sortArrayByIndices(
            plot_colors,
            sort_order.indices
          );
        } else {
          sorted_data_x = data.x;
          sorted_data_y = data.y;
          sorted_plot_colors = plot_colors;
        }

        let tspec = {
          defaultData: {
            x: sorted_data_x,
            y: sorted_data_y,
            color: sorted_plot_colors,
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
              size: { value: 2 },
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
  }, [
    readyToPlot,
    embeddings,
    selectedColNameUI,
    selectedredDimNamesUI,
    markerTableSelection,
    expression,
  ]);

  function onRedDimSelectionChange(obj) {
    setSelectedredDimNamesUI(obj.key);
  }

  function onColNameSelectionChange(obj) {
    setSelectedColNameUI(obj.key);
  }

  function onAssaySelectionChange(obj) {
    setSelectedAssayNameUI(obj.key);
  }

  function onMarkerSelectionChange(obj) {
    setSelectedMarkerUI(obj.key);
  }

  function onNomalizeUIChange(obj) {
    setNormalizeUI(obj.target.checked);
  }

  function onMarkerTableSelectionChange(selectedRowKeys, selectedRows) {
    setMarkerTableSelection(selectedRowKeys);
  }

  function onRemoveSelectionclick() {
    setMarkerTableSelection(null);
    setExpression(null);
    setReadyToPlot(true);
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
              style={{
                width: "100%",
                justifyContent: "space-evenly",
                alignContent: "center",
              }}
            >
              <h3>Choose a marker to order</h3>
              <Dropdown
                menu={{
                  items: markerItemsUI,
                  selectable: true,
                  onSelect: onMarkerSelectionChange,
                }}
                trigger={["click"]}
              >
                <a onClick={(e) => e.preventDefault()}>
                  <Space>
                    {selectedMarkerUI}
                    <DownOutlined />
                  </Space>
                </a>
              </Dropdown>
              <p>(defaults to showing row data of the experiment)</p>
              <Button
                type="primary"
                onClick={onRemoveSelectionclick}
                style={{ marginTop: "15px" }}
                disabled={markerTableSelection === null}
              >
                clear gene selection
              </Button>
            </Flex>
            <Flex style={{ height: "95%" }}>
              <Table
                ref={markerTableRef}
                dataSource={markerDataToShow}
                columns={markerDataColumnsToShow}
                // style={{
                //   wordWrap: "break-word",
                // }}
                virtual
                pagination={false}
                rowKey="key"
                size="small"
                scroll={{
                  x: markerTableUIScroll.x,
                  y: markerTableUIScroll.y, // "max-content"
                }}
                rowSelection={{
                  type: "radio",
                  selectedRowKeys: markerTableSelection,
                  onChange: onMarkerTableSelectionChange,
                }}
                tableLayout={undefined}
              ></Table>
            </Flex>
          </Splitter.Panel>
        </Splitter>
      </Flex>
    </Content>
  );
};

export default Explorer;
