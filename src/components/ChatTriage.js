import React, { useState, useRef } from 'react';
import logo from '../assets/logo.svg';
import medlinkLogo from '../assets/medlink_logo_black.png';
import { useAuth0 } from '@auth0/auth0-react';
import { getConfig } from '../config';
import { useAppointments } from '../utils/AppointmentsContext';
import history from '../utils/history';

const severityColors = {
  Minimal: '#2f855a',
  Mild: '#3182ce',
  Moderate: '#d69e2e',
  Concerning: '#dd6b20',
  Critical: '#c53030'
};

export default function ChatTriage() {
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0();
  const { apiOrigin = 'http://localhost:3001', audience } = getConfig();
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hi, I can help with basic medical triage guidance. Describe the symptoms or injury. I will give general advice and an estimated ER wait window. Always seek emergency care immediately if you think it is serious.'
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const { appointments, setAppointments } = useAppointments();
  const [pendingSchedule, setPendingSchedule] = useState(null); // holds severity + summary until user clicks
  const [pendingTopic, setPendingTopic] = useState('');

  const severityOrder = ['Minimal','Mild','Moderate','Concerning','Critical'];

  function computeScheduledSlot(severity) {
    // If no existing appointments just schedule now + 5 mins
    const now = new Date();
    const baseStart = new Date(now.getTime() + 5 * 60 * 1000);
    // Sort existing appointments by start time
    const existing = [...appointments].sort((a,b)=> new Date(a.start)-new Date(b.start));
    // If critical -> put at front (start at baseStart) and push others by slot (20m)
    const slotMs = 20 * 60 * 1000;
    if (severity === 'Critical') {
      const start = baseStart;
      const end = new Date(start.getTime() + slotMs);
      // shift others sequentially if they overlap or start before new end
      let cursor = end.getTime();
      const shifted = existing.map(appt => {
        const s = new Date(cursor);
        const e = new Date(cursor + (new Date(appt.end)- new Date(appt.start)));
        cursor = e.getTime();
        return { ...appt, start: s.toISOString(), end: e.toISOString() };
      });
      return { updated: shifted, inserted: { summary: `Emergency visit (Critical)`, description: `Auto-scheduled due to critical severity`, start: start.toISOString(), end: end.toISOString(), severity } };
    }
    // For non-critical: find earliest gap or append after last.
    // Keep order; if severity higher than average, try to move earlier.
    let lastEnd = baseStart;
    for (let i=0;i<existing.length;i++) {
      const apptStart = new Date(existing[i].start);
      if (apptStart - lastEnd >= slotMs) {
        // gap found
        const start = lastEnd;
        const end = new Date(start.getTime() + slotMs);
        return { updated: existing, inserted: { summary: `ER visit (${severity})`, description: `Scheduled based on triage severity`, start: start.toISOString(), end: end.toISOString(), severity } };
      }
      lastEnd = new Date(Math.max(lastEnd.getTime(), new Date(existing[i].end).getTime()));
    }
    const start = lastEnd;
    const end = new Date(start.getTime() + slotMs);
    return { updated: existing, inserted: { summary: `ER visit (${severity})`, description: `Scheduled based on triage severity`, start: start.toISOString(), end: end.toISOString(), severity } };
  }

  function schedulePending() {
    if (!pendingSchedule) return;
    const { severity } = pendingSchedule;
    const result = computeScheduledSlot(severity);
    let newList;
    // enrich inserted appt with selected hospital and topic if present
    const stored = (() => { try { return JSON.parse(localStorage.getItem('selected_hospital') || 'null'); } catch { return null; } })();
    const enrichedInserted = { ...result.inserted };
    if (stored) enrichedInserted.hospital = stored;
    if (pendingTopic && pendingTopic.trim()) enrichedInserted.topic = pendingTopic.trim();

    if (severity === 'Critical') {
      newList = [enrichedInserted, ...result.updated.map(a=>({ ...a }))];
    } else {
      newList = [...result.updated.map(a=>({ ...a })), enrichedInserted];
    }
    setAppointments(newList);
    setPendingSchedule(null);
    setPendingTopic('');
    // navigate to calendar page
    history.push('/calendar');
  }

  const send = async () => {
    if (!input.trim() || !isAuthenticated) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      let url = `${apiOrigin}/api/triage`;
      let headers = { 'Content-Type': 'application/json' };
      try {
        if (audience) {
          const token = await getAccessTokenSilently();
          headers.Authorization = `Bearer ${token}`;
        } else {
          // fallback to public endpoint if enabled server-side
          url = `${apiOrigin}/api/triage/public`;
        }
      } catch {
        // If token retrieval fails, fallback to public if available
        if (!audience) url = `${apiOrigin}/api/triage/public`;
      }
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userMsg.content })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setMessages(m => [...m, { role: 'assistant', content: `Error: ${data.error || 'unknown'}${data.detail ? ' - ' + data.detail : ''}` }]);
      } else if (data.refused) {
        setMessages(m => [...m, { role: 'assistant', content: data.advice || 'Please provide medical symptoms or concerns.' }]);
      } else if (data.error) {
        setMessages(m => [...m, { role: 'assistant', content: `Server error: ${data.error}` }]);
      } else {
  const color = severityColors[data.severity] || '#444';
  const formatted = `Severity: ${data.severity}\nSymptoms: ${data.symptomsSummary}\nAdvice: ${data.advice}\nEstimated ER wait window: ${data.estimatedERWait}\n\n${data.disclaimer}\n(Seek care promptly; do not delay going to the ER.)`;
  setPendingSchedule({ severity: data.severity });
  setMessages(m => [...m, { role: 'assistant', content: formatted, severity: data.severity, color, canSchedule: true }]);
      }
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `Network or authorization error: ${e.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, 50);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="triage-wrapper" style={styles.wrapper}>
      <div style={styles.header}>Triage Assistant (Gemini)</div>
      <div ref={listRef} style={styles.messages}>
        {messages.map((m, i) => {
          const isAssistant = m.role === 'assistant';
          return (
            <div key={i} style={{ ...styles.msgRow }}>
              {isAssistant && (
                <img src={logo} alt="assistant" style={styles.avatarLeft} />
              )}
              <div style={{ ...styles.msg, background: isAssistant ? '#f7fafc' : '#edf2f7' }}>
                {m.severity && (
                  <span style={{ ...styles.severityBadge, background: severityColors[m.severity] || '#444' }}>{m.severity}</span>
                )}
                <pre style={styles.pre}>{m.content}</pre>
                {m.canSchedule && pendingSchedule && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        placeholder="Brief topic (e.g. chest pain)"
                        value={pendingTopic}
                        onChange={e => setPendingTopic(e.target.value)}
                        style={{ padding: '6px 8px', borderRadius:6, border: '1px solid #e2e8f0', fontSize:13 }}
                      />
                      <button
                        onClick={schedulePending}
                        style={{ background:'#2563eb', color:'#fff', border:'none', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:600 }}
                      >Schedule Appointment</button>
                    </div>
                  </div>
                )}
              </div>
              {!isAssistant && (
                <img
                  src={(user && user.picture) || medlinkLogo}
                  alt="you"
                  style={styles.avatarRight}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = medlinkLogo; }}
                />
              )}
            </div>
          );
        })}
        {loading && <div style={styles.loading}>Analyzing symptoms...</div>}
      </div>
      <div style={styles.inputRow}>
        <textarea
          style={styles.textarea}
          placeholder='Describe symptoms or injury...'
          value={input}
          disabled={loading}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
        />
        <button style={styles.button} disabled={loading || !input.trim()} onClick={send}>Send</button>
      </div>
    </div>
  );
}

const styles = {
  // allow CSS to control final width; use full width of parent
  wrapper: { width: '100%', margin: '4px auto 20px', textAlign: 'left', border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', flexDirection: 'column', background: '#ffffff', boxShadow: '0 4px 10px rgba(0,0,0,0.04)' },
  header: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: 15, background:'#f8fafc', borderTopLeftRadius:12, borderTopRightRadius:12 },
  messages: { padding: 16, overflowY: 'auto', overflowX: 'hidden', maxHeight: 320 },
  msg: { padding: '12px 14px', borderRadius: 8, marginBottom: 12, position: 'relative', fontSize: 14, lineHeight: 1.4, border: '1px solid #e2e8f0', overflowWrap: 'break-word', wordBreak: 'break-word' },
  pre: { margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%' },
  severityBadge: { position: 'absolute', top: -10, right: -10, color:'#fff', fontSize: 11, padding: '3px 8px', borderRadius: 20, boxShadow:'0 2px 4px rgba(0,0,0,0.15)' },
  msgRow: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  avatarLeft: { width: 28, height: 28, borderRadius: 6, marginTop: 6, flex: '0 0 28px', objectFit: 'cover', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  avatarRight: { width: 28, height: 28, borderRadius: 14, marginTop: 6, flex: '0 0 28px', objectFit: 'cover', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  inputRow: { display: 'flex', borderTop: '1px solid #e2e8f0' },
  textarea: { flex: 1, resize: 'vertical', padding: 12, border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14 },
  button: { border: 'none', background:'#2563eb', color:'#fff', padding: '0 20px', cursor:'pointer', fontWeight:600 },
  loading: { fontSize: 12, color: '#555', fontStyle:'italic', marginBottom:8 }
};
