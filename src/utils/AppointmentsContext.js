import React, { createContext, useContext, useState } from "react";

const AppointmentsContext = createContext();

export function AppointmentsProvider({ children }) {
  // Default demo appointment
  const defaultAppointments = [
    {
      summary: 'Telehealth appointment',
      description: 'Scheduled via MedLink',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  ];

  // Load from localStorage on first render, or use default if empty
  const [appointments, setAppointmentsState] = useState(() => {
    try {
      const stored = localStorage.getItem('appointments');
      if (stored) return JSON.parse(stored);
      // If nothing in storage, use default
      localStorage.setItem('appointments', JSON.stringify(defaultAppointments));
      return defaultAppointments;
    } catch {
      return defaultAppointments;
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
