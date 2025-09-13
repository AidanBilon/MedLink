import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

import logo from "../assets/logo.svg";

const Hero = () => {
  const { isAuthenticated } = useAuth0();

  if (!isAuthenticated) {
    return (
      <div className="text-center hero my-5 unauth-hero">
        <img className="mb-3 app-logo" src={logo} alt="MedLink logo" width="120" />
        <h1 className="mb-4">Welcome to MedLink</h1>

        <p className="lead">
          Please proceed to login to continue.
        </p>

        <div className="login-hint">
          <span className="curly-arrow" aria-hidden>↶</span>
          <span className="hint-text">Click Login</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center hero my-5">
      <img className="mb-3 app-logo" src={logo} alt="MedLink logo" width="120" />
      <h1 className="mb-4">MedLink</h1>

      <p className="lead">
        This is a sample application that demonstrates an authentication flow for
        an SPA, using <a href="https://reactjs.org">React.js</a>
      </p>
    </div>
  );
};

export default Hero;
