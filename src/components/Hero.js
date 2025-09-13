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
    <div className="text-center hero mt-4 mb-1">
      <img className="mb-3 app-logo" src={logo} alt="MedLink logo" width="120" />
      <h1 className="mb-4">MedLink</h1>
  <p className="lead mb-2">Describe your symptoms for basic triage guidance below.</p>
  <p className="small text-muted mt-3 disclaimer">Disclaimer: This is informational only and not a medical diagnosis. The scheduled "Appointments" are fictitious, being used only for demonstration purposes and they will NOT be honoured at any of the example clinics. If you think this may be an emergency call 911 or go to the nearest emergency department immediately.</p>
    </div>
  );
};

export default Hero;
