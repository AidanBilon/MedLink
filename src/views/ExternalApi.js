import React, { useState, useEffect } from "react";
import { useAppointments } from "../utils/AppointmentsContext";
import { Button, Alert } from "reactstrap";
import Highlight from "../components/Highlight";
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { getConfig } from "../config";
import Loading from "../components/Loading";

export const ExternalApiComponent = () => {
  const { setAppointments } = useAppointments();
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
      summary: 'Telehealth appointment',
      description: 'Scheduled via MedLink',
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

  // Appointments stored locally for preview; keyed by date string.
  const [appointments, setLocalAppointments] = useState(() => {
    const d = new Date(form.start);
    const key = d.toDateString();
    return {
      [key]: [
        {
          summary: form.summary,
          description: form.description,
          start: form.start,
          end: form.end,
        },
      ],
    };
  });

  // Sync local appointments to context
  useEffect(() => {
    // Flatten all appointments into a single array for context
    const all = Object.values(appointments).flat();
    setAppointments(all);
  }, [appointments, setAppointments]);

  const [selectedDate, setSelectedDate] = useState(new Date(form.start).toDateString());

  const handleDateClick = (date) => {
    setSelectedDate(date.toDateString());
    // Future: load events for this date from Google Calendar
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
        <p className="lead">Calendar & Appointments</p>

        <p>
          Connect your Google Calendar: the fields below are read-only and will
          be populated by the assistant. When ready, press "Send to Calendar"
          to add the event to your selected calendar.
        </p>

        <div className="mt-3 d-md-flex">
          <div style={{ minWidth: 360, marginRight: 24, padding: 12, borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.08)', background: '#fff' }}>
            <div className="form-group">
              <label>Calendar ID</label>
              <input name="calendarId" className="form-control" value={form.calendarId} readOnly style={{ borderRadius:6 }} />
            </div>
            <div className="form-group">
              <label>Summary</label>
              <input name="summary" className="form-control" value={form.summary} readOnly />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input name="description" className="form-control" value={form.description} readOnly />
            </div>
            <div className="form-group">
              <label>Start (ISO)</label>
              <input name="start" className="form-control" value={form.start} readOnly />
            </div>
            <div className="form-group">
              <label>End (ISO)</label>
              <input name="end" className="form-control" value={form.end} readOnly />
            </div>
            <div className="form-group">
              <label>Timezone</label>
              <input name="timezone" className="form-control" value={form.timezone} readOnly />
            </div>
            <Button color="primary" className="mt-2" onClick={callApi} disabled={!audience}>
              Send to Calendar
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ marginLeft: 8 }}>
              <SmallCalendar startIso={form.start} onDateClick={handleDateClick} selectedDate={selectedDate} appointmentsByDate={appointments} />
            </div>
            <div style={{ marginLeft: 12, minWidth: 260 }}>
              <div style={{ padding: 12, borderRadius:8, boxShadow:'0 2px 6px rgba(0,0,0,0.06)', background:'#fff' }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>Appointments</strong>
                {selectedDate && appointments[selectedDate] ? (
                  appointments[selectedDate].map((a, idx) => (
                    <div key={idx} style={{ marginBottom: 8, padding: 8, borderRadius:6, background: '#fbfbfb' }}>
                      <div style={{ fontWeight: 600 }}>{a.summary}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{new Date(a.start).toLocaleString()} - {new Date(a.end).toLocaleTimeString()}</div>
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
    <div style={{ width: 260 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <strong>{date.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {['S','M','T','W','T','F','S'].map((h, idx) => (
          <div key={`h-${idx}`} style={{ textAlign: 'center', fontSize: 12, color:'#666' }}>{h}</div>
        ))}
        {days.map((d, i) => {
          const isSelected = d && d.toDateString() === selectedDate;
          return (
            <div
              key={i}
              onClick={() => d && onDateClick && onDateClick(d)}
              role={d ? 'button' : undefined}
              style={{
                minHeight: 28,
                textAlign: 'center',
                lineHeight: '28px',
                borderRadius:4,
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
