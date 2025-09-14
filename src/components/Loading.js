import React from "react";
import loading from "../assets/loading.svg";

const Loading = () => (
  <div className="spinner">
    <img src={loading} alt="Loading" style={{ width: 64, height: 'auto' }} />
  </div>
);

export default Loading;
