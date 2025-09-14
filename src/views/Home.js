import React, { Fragment } from "react";
import { useAuth0 } from "@auth0/auth0-react";

import Hero from "../components/Hero";
import ChatTriage from "../components/ChatTriage";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import UnauthenticatedLanding from "../components/UnauthenticatedLanding";
import MedLinkBackground from "../assets/MedLink_Background.png"; // adjust path if needed

const Home = () => {
  const { isAuthenticated } = useAuth0();

  // Full-bleed background (escapes parent containers)
  const FullBleedBackground = ({ children }) => (
    <div
      style={{
        backgroundImage: `url(${MedLinkBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        paddingTop: "2rem",
        paddingBottom: "2rem",
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
      }}
    >
      {/* Keep content nicely centered */}
      <div style={{ maxWidth: 1100, margin: "0 auto", paddingInline: 16 }}>
        {children}
      </div>
    </div>
  );

  // Center-column background (only the middle panel)
  const CenterBackgroundWrapper = ({ children }) => (
    <div
      style={{
        backgroundImage: `url(${MedLinkBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        borderRadius: 12,
        padding: "1.5rem",
        minHeight: "100%",
      }}
    >
      {children}
    </div>
  );

  if (!isAuthenticated) {
    // Unauthenticated: full-bleed background
    return (
      <Fragment>
        <FullBleedBackground>
          <UnauthenticatedLanding />
        </FullBleedBackground>
      </Fragment>
    );
  }

  // Authenticated: background only on center column
  return (
    <Fragment>
      <div className="landing-layout flex-desktop mt-4">
        <div className="sidebar-col left-fixed">
          <LeftSidebar />
        </div>
        <div className="main-col flex-main">
          <div className="center-col">
            <CenterBackgroundWrapper>
              <Hero />
              <ChatTriage />
            </CenterBackgroundWrapper>
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
