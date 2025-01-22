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
} from "antd";
const { Header, Content, Sider } = Layout;
import { DatabaseTwoTone, DownOutlined } from "@ant-design/icons";

import * as wobbegongapi from "../utils/wobbegongapi.js";
import * as wb from "wobbegong";
import WebGLVis from "epiviz.gl";

import Rainbow from "../utils/rainbowvis.js";
import { randomColor } from "randomcolor";
import { defaultColor, getMinMax } from "../utils/plotutils.js";
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

  // available embeddings
  const [redDimNamesUI, setRedDimNamesUI] = useState(null);

  // user selected embedding
  const [selectedredDimNamesUI, setSelectedredDimNamesUI] = useState(null);

  // embedding to cache and plot
  const [embeddings, setEmbeddings] = useState({});
  // ref to the plot dom container
  const embeddingContainer = useRef();
  // ref to the plot object
  const [scatterplot, setScatterplot] = useState(null);
  // flag to signal ready for plotting
  const [readyToPlot, setReadyToPlot] = useState(false);

  const [chooseAssayUI, setChooseAssayUI] = useState(null);
  const [assay, setAssay] = useState(null);
  const [nomalizeCountsUI, setNormalizeCountsUI] = useState(null);
  const [expression, setExpression] = useState(null);

  useEffect(() => {
    // apparently a new way to call async functions within useEffects
    // to keep react happy

    // when the component is Loaded
    async function fetchData() {
      let markers = await wobbegongapi.findMarkerFiles(record.path);
      console.log(markers);
      let conversion = await wobbegongapi.convertAllFiles(record.path, markers);
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
      let rednames = [];
      sce.reducedDimensionNames().forEach((x, i) => {
        rednames.push({ key: String(i), label: x });
      });
      setRedDimNamesUI(rednames);
      setSelectedredDimNamesUI("0");
      setSce(sce);
    }

    fetchData();
  }, []);

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
  //       vals = await wobbegongapi.normalizeCounts(vals, sf, true);
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

        for (let i = 0; i < data.x.length; i++) {
          plot_colors[i] = "#729ECE";
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
  }, [readyToPlot, embeddings]);

  function onRedDimSelectionChange(obj) {
    setSelectedredDimNamesUI(obj.key);
  }

  return (
    <Content>
      <Collapse
        size="small"
        items={[
          {
            key: "1",
            label: "Dataset Info",
            items: (
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
                <p>soemthing else</p>
              </>
            ),
          },
        ]}
      />
      {redDimNamesUI && sce && (
        <>
          {console.log(redDimNamesUI)}
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
