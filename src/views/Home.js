import React, { Fragment } from "react";
import { useAuth0 } from "@auth0/auth0-react";

import Hero from "../components/Hero";
import ChatTriage from "../components/ChatTriage";
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
      <div className="landing-layout flex-desktop mt-4">
        <div className="sidebar-col left-fixed">
          <LeftSidebar />
        </div>
        <div className="main-col flex-main">
          <div className="center-col">
            <Hero />
            <ChatTriage />
          </div>
        </div>
        <div className="sidebar-col right-fixed">
          <RightSidebar />
        </div>
      </div>
    </Fragment>
  );
};

export default Home;
