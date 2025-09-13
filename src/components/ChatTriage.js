import React, { useState, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getConfig } from '../config';

const severityColors = {
  Minimal: '#2f855a',
  Mild: '#3182ce',
  Moderate: '#d69e2e',
  Concerning: '#dd6b20',
  Critical: '#c53030'
};

export default function ChatTriage() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { apiOrigin = 'http://localhost:3001', audience } = getConfig();
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hi, I can help with basic medical triage guidance. Describe the symptoms or injury. I will give general advice and an estimated ER wait window. Always seek emergency care immediately if you think it is serious.'
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

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
        setMessages(m => [...m, { role: 'assistant', content: formatted, severity: data.severity, color }]);
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
        {messages.map((m, i) => (
          <div key={i} style={{ ...styles.msg, background: m.role === 'assistant' ? '#f7fafc' : '#edf2f7' }}>
            {m.severity && (
              <span style={{ ...styles.severityBadge, background: severityColors[m.severity] || '#444' }}>{m.severity}</span>
            )}
            <pre style={styles.pre}>{m.content}</pre>
          </div>
        ))}
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
  messages: { padding: 16, overflowY: 'auto', maxHeight: 320 },
  msg: { padding: '12px 14px', borderRadius: 8, marginBottom: 12, position: 'relative', whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.4, border: '1px solid #e2e8f0' },
  pre: { margin: 0, fontFamily: 'inherit' },
  severityBadge: { position: 'absolute', top: -10, right: -10, color:'#fff', fontSize: 11, padding: '3px 8px', borderRadius: 20, boxShadow:'0 2px 4px rgba(0,0,0,0.15)' },
  inputRow: { display: 'flex', borderTop: '1px solid #e2e8f0' },
  textarea: { flex: 1, resize: 'vertical', padding: 12, border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14 },
  button: { border: 'none', background:'#2563eb', color:'#fff', padding: '0 20px', cursor:'pointer', fontWeight:600 },
  loading: { fontSize: 12, color: '#555', fontStyle:'italic', marginBottom:8 }
};
