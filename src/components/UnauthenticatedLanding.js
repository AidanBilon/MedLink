import React from "react";
import logo from "../assets/logo.svg";

const UnauthenticatedLanding = () => (
  <div className="unauth-landing text-center py-5">
    <img src={logo} alt="MedLink Logo" style={{ width: 120, marginBottom: 24 }} />
    <h2 className="mb-3">Welcome to MedLink</h2>
    <p className="lead mb-4">To continue, please sign in. You'll get access to personalized tools and secure data.</p>
    <p className="text-muted">If you don't have an account, click Sign Up on the Login dialog.</p>
  </div>
);

export default UnauthenticatedLanding;
