import React from "react";
import medlinkLogo from "../assets/medlink_logo_black.png";

// Small web-hosted icons (kept external to avoid bundling). Replace if you prefer local assets.
const AUTH_ICON = 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/auth0.svg';
const CHAT_ICON = 'https://www.gstatic.com/images/branding/product/1x/assistant_48dp.png';

const Footer = () => (
  <footer className="bg-light text-center app-footer">
    <div className="logo mb-2">
      <img src={medlinkLogo} alt="MedLink" height="28" />
    </div>
    <p>Developed by Aidan and Zara </p>
  <p>Auth by <a href="https://auth0.com"><img src={AUTH_ICON} alt="Auth0" className="footer-icon" /> Auth0</a></p>
  <p>Chat by <a href="https://gemini.google.com/app"><img src={CHAT_ICON} alt="Gemini" className="footer-icon" /> Gemini</a></p>
  <p>.</p>
  <p>.</p>
  <p>.</p>
  </footer>
);

export default Footer;
