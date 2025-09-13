import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { loadProfile } from "../utils/profileStore";

const LeftSidebar = () => {
  const { user, isAuthenticated } = useAuth0();
  const saved = user?.sub ? loadProfile(user.sub) : null;
  const displayName = saved?.firstName || saved?.lastName
    ? `${saved.firstName || ''} ${saved.lastName || ''}`.trim()
    : (user?.name || 'guest');

  return (
    <aside className="sidebar sidebar-left d-flex flex-column p-3">
      <div className="sidebar-section sidebar-top mb-3">
        <h6 className="mb-1">Welcome</h6>
  <div className="small text-muted">{isAuthenticated ? `Hello, ${displayName}` : "Hello, guest"}</div>
      </div>

      <div className="sidebar-section sidebar-middle flex-grow-1 mb-3">
        {/* Placeholder for news / API content */}
      </div>

      <div className="sidebar-section sidebar-bottom">
        {/* Placeholder for Google Maps iframe or component */}
      </div>
    </aside>
  );
};

export default LeftSidebar;
