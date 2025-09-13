import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { loadProfile } from "../utils/profileStore";
import HospitalsMap from "./HospitalsMap";
import { useAppointments } from "../utils/AppointmentsContext";

const LeftSidebar = () => {
  const { user, isAuthenticated } = useAuth0();
  const saved = user?.sub ? loadProfile(user.sub) : null;
  const displayName = saved?.firstName || saved?.lastName
    ? `${saved.firstName || ''} ${saved.lastName || ''}`.trim()
    : (user?.name || 'guest');

  const { appointments } = useAppointments();
  return (
    <aside className="sidebar sidebar-left d-flex flex-column p-3">
      <div className="sidebar-section sidebar-top mb-3">
        <h6 className="mb-1">Welcome</h6>
        <div className="small text-muted">{isAuthenticated ? `Hello, ${displayName}` : "Hello, guest"}</div>
        {appointments && appointments.length > 0 && (
          <div className="mt-3">
            <h6 className="mb-1">Upcoming Appointments</h6>
            <ul className="list-unstyled small mb-0">
              {appointments.map((a, idx) => (
                <li key={idx} className="mb-2">
                  <div style={{ fontWeight: 600 }}>{a.summary}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{new Date(a.start).toLocaleString()} - {new Date(a.end).toLocaleTimeString()}</div>
                  <div style={{ fontSize: 13 }}>{a.description}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="sidebar-section sidebar-middle flex-grow-1 mb-3">
        {/* Placeholder for news / API content */}
      </div>

      <div className="sidebar-section sidebar-bottom">
        <HospitalsMap />
      </div>
    </aside>
  );
};

export default LeftSidebar;
