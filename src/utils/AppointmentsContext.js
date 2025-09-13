import React, { createContext, useContext, useState } from "react";
// Note: no seeded appointments by default. Appointments will be empty until
// scheduled by the assistant or user. Keep fake generator available if needed.
import { sampleAppointmentsToday } from './fakeAppointments';

const AppointmentsContext = createContext();

export function AppointmentsProvider({ children }) {
  // Start with an empty appointment list; if there is stored state, use it.
  const [appointments, setAppointmentsState] = useState(() => {
    try {
      const stored = localStorage.getItem('appointments');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Filter out legacy/demo Telehealth appointment entries
          const cleaned = parsed.filter && Array.isArray(parsed)
            ? parsed.filter(a => !(a.summary && a.summary.toLowerCase().includes('telehealth')) && !(a.description && a.description.toLowerCase().includes('scheduled via medlink')))
            : parsed;
          // If cleaned differs, persist cleaned
          if (Array.isArray(parsed) && JSON.stringify(cleaned) !== JSON.stringify(parsed)) {
            try { localStorage.setItem('appointments', JSON.stringify(cleaned)); } catch {}
          }
          return cleaned;
        } catch {
          return [];
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Save to localStorage whenever appointments change
  const setAppointments = (newAppointments) => {
    setAppointmentsState(newAppointments);
    try {
      localStorage.setItem('appointments', JSON.stringify(newAppointments));
    } catch {}
  };

  return (
    <AppointmentsContext.Provider value={{ appointments, setAppointments }}>
      {children}
    </AppointmentsContext.Provider>
  );
}

export function useAppointments() {
  return useContext(AppointmentsContext);
}
