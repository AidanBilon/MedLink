import React, { Fragment } from "react";
import { useAuth0 } from "@auth0/auth0-react";

import Hero from "../components/Hero";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import UnauthenticatedLanding from "../components/UnauthenticatedLanding";

const Home = () => {
  const { isAuthenticated } = useAuth0();

  if (!isAuthenticated) {
    return (
        <Fragment>
          <div className="container py-5">
            <UnauthenticatedLanding />
          </div>
        </Fragment>
    );
  }

  return (
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
};

export default Home;
