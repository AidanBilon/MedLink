import React, { Fragment } from "react";

import Hero from "../components/Hero";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";

const Home = () => (
  <Fragment>
    <div className="landing-layout mt-4">
      <div className="row gx-0">
        <div className="col-12 col-lg-2 sidebar-col">
          <LeftSidebar />
        </div>
        <div className="col-12 col-lg-8 main-col py-4">
          <Hero />
        </div>
        <div className="col-12 col-lg-2 sidebar-col">
          <RightSidebar />
        </div>
      </div>
    </div>
  </Fragment>
);

export default Home;
