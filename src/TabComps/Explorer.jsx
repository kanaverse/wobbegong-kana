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
  Descriptions,
  Tag,
} from "antd";
const { Header, Content, Sider } = Layout;
import { DatabaseTwoTone } from "@ant-design/icons";

import * as wobbegongapi from "../utils/wobbegongapi.js";

const Explorer = (props) => {
  console.log(props.record);

  wobbegongapi.getSE(props.record.path.replace("/_metadata.json", ""))
  .then((se) => console.log(se));
  // console.log(se)

  // let itemsToDisplay = [];

  // itemsToDisplay.push({
  //   key: "authors",
  //   label: "Authors",
  //   children: props.record.metadata.authors.join(", "),
  // });

  // // itemsToDisplay.push({
  // //   key: "description",
  // //   label: "Description",
  // //   children: props.record.metadata.description,
  // // });

  // itemsToDisplay.push({
  //   key: "organism",
  //   label: "Organism",
  //   children: props.record.metadata.organism.join(", "),
  // });

  // // itemsToDisplay.push({
  // //   key: "organism",
  // //   label: "Organism",
  // //   children: props.record.metadata.organism.join(", "),
  // // });

  return (
    <Content>
      <p>
        <span>
          <DatabaseTwoTone />
          {"  " + props.record.metadata.title}
        </span>
      </p>
    </Content>
  );
};

export default Explorer;
