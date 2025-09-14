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
        <div style={{ fontSize: '1.2rem', color: '#000000' }}>{isAuthenticated ? `Hello,` : "Hello, guest"}</div>
        <div style={{ marginTop: 8, fontSize: '1.6rem', fontWeight: 800, color: '#01569d', lineHeight: 1 }}>{isAuthenticated ? displayName : ''}</div>
        <div className="mt-3">
          <div style={{ padding: 12, borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.06)', background: '#fff', display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, flex: '0 0 44px' }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#01569d' }}>A</div>
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', marginBottom: 8 }}>Appointments</strong>
              {appointments && appointments.length > 0 ? (
                <ul className="list-unstyled small mb-0">
                  {appointments.map((a, idx) => (
                    <li key={idx} className="mb-2">
                      <div style={{ fontWeight: 600 }}>{a.summary}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{new Date(a.start).toLocaleString()} - {new Date(a.end).toLocaleTimeString()}</div>
                      <div style={{ fontSize: 13 }}>{a.description}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: '#666' }}>No upcoming appointments.</div>
              )}
            </div>
          </div>
        </div>
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
