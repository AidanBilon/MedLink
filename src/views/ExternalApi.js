import React, { useState, useEffect } from "react";
import { useAppointments } from "../utils/AppointmentsContext";
import { Button, Alert } from "reactstrap";
import Highlight from "../components/Highlight";
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { getConfig } from "../config";
import Loading from "../components/Loading";

export const ExternalApiComponent = () => {
  const apptCtx = useAppointments() || {};
  const contextAppointments = apptCtx.appointments || [];
  const setAppointments = apptCtx.setAppointments || (()=>{});
  const { apiOrigin = "http://localhost:3001", audience } = getConfig();

  const [state, setState] = useState({
    showResult: false,
    apiMessage: "",
    error: null,
  });

  const [form, setForm] = useState(() => {
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    return {
      calendarId: 'primary',
      summary: '',
      description: '',
      start: now.toISOString(),
      end: inOneHour.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    };
  });

  const { getAccessTokenSilently, loginWithPopup, getAccessTokenWithPopup } = useAuth0();

  const handleConsent = async () => {
    try {
      await getAccessTokenWithPopup();
      setState({ ...state, error: null });
    } catch (error) {
      setState({ ...state, error: error.error });
    }

    await callApi();
  };

  const handleLoginAgain = async () => {
    try {
      await loginWithPopup();
      setState({ ...state, error: null });
    } catch (error) {
      setState({ ...state, error: error.error });
    }

    await callApi();
  };

  const callApi = async () => {
    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/external`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          calendarId: form.calendarId,
          summary: form.summary,
          description: form.description,
          start: form.start,
          end: form.end,
          timezone: form.timezone
        })
      });

      const responseData = await response.json();

      setState({ ...state, showResult: true, apiMessage: responseData });
    } catch (error) {
      setState({ ...state, error: error.error });
    }
  };

  const handle = (e, fn) => {
    e.preventDefault();
    fn();
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  // Local appointments mapping keyed by date string. Start empty; we'll
  // derive from context if available to avoid overwriting seed data.
  const [appointments, setLocalAppointments] = useState({});

  // Sync local appointments to context, but do not overwrite existing context
  // appointments (for example the demo day's seeded appointments).
  useEffect(() => {
    const localAll = Object.values(appointments).flat();
    if (!contextAppointments || contextAppointments.length === 0) {
      // If context empty, publish local appointments
      setAppointments(localAll);
    } else {
      // If context already has data, reflect it into local mapping for the calendar UI
      const byDate = {};
      contextAppointments.forEach(a => {
        const key = new Date(a.start).toDateString();
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(a);
      });
      // Only update local if changed to avoid loops
      const keysA = Object.keys(byDate).sort();
      const keysB = Object.keys(appointments).sort();
      if (JSON.stringify(keysA) !== JSON.stringify(keysB)) {
        setLocalAppointments(byDate);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, contextAppointments]);

  const [selectedDate, setSelectedDate] = useState(new Date(form.start).toDateString());

  const handleDateClick = (date) => {
    setSelectedDate(date.toDateString());
    // Future: load events for this date from Google Calendar
  };

  // Remove appointment at index for a given date key and recalculate times
  const recomputeAppointmentsForDate = (dateKey, apptsForDate) => {
    // Keep each appointment duration; re-flow them back-to-back starting at the earliest original start
    if (!apptsForDate || apptsForDate.length === 0) return [];
    // Find the earliest start among remaining appointments, or use now + 5min if none
    let earliest = apptsForDate.reduce((min, a) => {
      const s = new Date(a.start).getTime();
      return min === null ? s : Math.min(min, s);
    }, null);
    if (earliest === null) earliest = Date.now() + 5 * 60 * 1000;

    // Recreate appointments sequentially preserving each original duration
    const rebuilt = [];
    let cursor = new Date(earliest);
    for (let i = 0; i < apptsForDate.length; i++) {
      const original = apptsForDate[i];
      const dur = new Date(original.end).getTime() - new Date(original.start).getTime();
      const s = new Date(cursor);
      const e = new Date(s.getTime() + (dur > 0 ? dur : 20 * 60 * 1000));
      rebuilt.push({ ...original, start: s.toISOString(), end: e.toISOString() });
      cursor = e;
    }
    return rebuilt;
  };

  const cancelAppointment = (dateKey, idx) => {
    const dateList = appointments[dateKey] ? [...appointments[dateKey]] : [];
    if (!dateList || idx < 0 || idx >= dateList.length) return;
    const toRemove = dateList[idx];
    // Confirm with user
    // Using window.confirm for simplicity
    const ok = window.confirm(`Are you sure you want to cancel the appointment "${toRemove.summary}" scheduled at ${new Date(toRemove.start).toLocaleString()}?`);
    if (!ok) return;

    // Remove the appointment
    dateList.splice(idx, 1);

    // Recompute times for remaining appointments on that date
    const rebuilt = recomputeAppointmentsForDate(dateKey, dateList);

    // Update local mapping and global context (flatten to array)
    const newLocal = { ...appointments, [dateKey]: rebuilt };
    setLocalAppointments(newLocal);
    const flat = Object.values(newLocal).flat();
    setAppointments(flat);
  };

  return (
    <>
      <div className="mb-5">
        {state.error === "consent_required" && (
          <Alert color="warning">
            You need to{' '}
            <a href="#/" className="alert-link" onClick={(e) => handle(e, handleConsent)}>
              consent to get access to users api
            </a>
          </Alert>
        )}

        {state.error === "login_required" && (
          <Alert color="warning">
            You need to{' '}
            <a href="#/" className="alert-link" onClick={(e) => handle(e, handleLoginAgain)}>
              log in again
            </a>
          </Alert>
        )}

  <h1>Calendar & Appointments</h1>

        <div className="mt-3 d-md-flex">
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ marginLeft: 8 }}>
              <SmallCalendar startIso={form.start} onDateClick={handleDateClick} selectedDate={selectedDate} appointmentsByDate={appointments} />
            </div>
            <div style={{ marginLeft: 12, minWidth: 260 }}>
              <div style={{ padding: 12, borderRadius:8, boxShadow:'0 2px 6px rgba(0,0,0,0.06)', background:'#fff' }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>Appointments</strong>
                {selectedDate && appointments[selectedDate] ? (
                  appointments[selectedDate].map((a, idx) => (
                    <div key={idx} style={{ marginBottom: 8, padding: 8, borderRadius:6, background: '#fbfbfb', position: 'relative' }}>
                      <button
                        aria-label={`cancel-${idx}`}
                        onClick={() => cancelAppointment(selectedDate, idx)}
                        style={{ position: 'absolute', right: 8, top: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: '#999' }}
                      >
                        ×
                      </button>
                      <div style={{ fontWeight: 600 }}>{a.summary}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{new Date(a.start).toLocaleString()} - {new Date(a.end).toLocaleTimeString()}</div>
                      {a.hospital && a.hospital.name && (
                        <div style={{ fontSize: 13, color: '#333', marginTop: 4 }}>Hospital: <strong>{a.hospital.name}</strong></div>
                      )}
                      {a.topic && (
                        <div style={{ fontSize: 13, color: '#333', marginTop: 4 }}>Topic: {a.topic}</div>
                      )}
                      <div style={{ fontSize: 13 }}>{a.description}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#666' }}>No appointments for this date.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="result-block-container">
          {state.showResult && (
            <div className="result-block" data-testid="api-result">
              <h6 className="muted">Result</h6>
              <Highlight>
                <span>{JSON.stringify(state.apiMessage, null, 2)}</span>
              </Highlight>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default withAuthenticationRequired(ExternalApiComponent, {
  onRedirecting: () => <Loading />,
});

function SmallCalendar({ startIso, onDateClick, selectedDate }) {
  const date = new Date(startIso);
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const days = [];
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  return (
    <div style={{ width: 520 }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <strong style={{ fontSize: '1.25rem' }}>{date.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {['S','M','T','W','T','F','S'].map((h, idx) => (
          <div key={`h-${idx}`} style={{ textAlign: 'center', fontSize: 14, color:'#666', paddingBottom: 6 }}>{h}</div>
        ))}
        {days.map((d, i) => {
          const isSelected = d && d.toDateString() === selectedDate;
          return (
            <div
              key={i}
              onClick={() => d && onDateClick && onDateClick(d)}
              role={d ? 'button' : undefined}
              style={{
                minHeight: 56,
                textAlign: 'center',
                lineHeight: '56px',
                borderRadius:8,
                background: isSelected ? '#2b6cb0' : 'transparent',
                color: isSelected ? '#fff' : '#333',
                cursor: d ? 'pointer' : 'default',
                userSelect: 'none'
              }}
            >
              {d ? d.getDate() : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
