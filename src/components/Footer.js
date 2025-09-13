import React from "react";
import medlinkLogo from "../assets/medlink_logo_black.png";

const Footer = () => (
  <footer className="bg-light p-3 text-center">
    <div className="logo mb-2">
      <img src={medlinkLogo} alt="MedLink" height="28" />
    </div>
    <p>Developed by Aidan and Zara </p>
    <p>Auth by <a href="https://auth0.com">Auth0</a></p>
  </footer>
);

export default Footer;
