import React from "react";
import ReactDOM from "react-dom";
import "@ecl/ec-preset-website/dist/styles/ecl-ec-preset-website.css";
import "./ecl.css";
import "./custom.css";
import App from "./App";

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
