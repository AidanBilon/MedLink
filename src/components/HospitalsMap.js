import React, { useEffect, useRef, useState, useCallback } from 'react';

// Loads Google Maps JS API dynamically
function useGoogleMaps(apiKey) {
  const [status, setStatus] = useState(apiKey ? 'loading' : 'missing-key');
  const [errorDetail, setErrorDetail] = useState(null);
  useEffect(() => {
    if (!apiKey) return;
  if (window.google && window.google.maps) {
      setStatus('ready');
      return;
    }
    const existing = document.querySelector('script[data-google-maps="true"]');
    if (existing) {
      existing.addEventListener('load', () => setStatus('ready'));
      return;
    }
    const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'true';
    script.onload = () => setStatus('ready');
    script.onerror = () => {
      setErrorDetail('network-or-blocked');
      setStatus('error');
    };
    document.head.appendChild(script);
  }, [apiKey]);
  return { status, errorDetail };
}

const INITIAL_STATE = { loading: true, error: null };

export default function HospitalsMap() {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (typeof window !== 'undefined' && !window.__GM_KEY_LOGGED) {
    // Temporary diagnostic log (remove later)
    // eslint-disable-next-line no-console
    console.log('HospitalsMap apiKey present?', !!apiKey);
    window.__GM_KEY_LOGGED = true;
  }
  // Capture auth failures (invalid / restricted key) once.
  if (typeof window !== 'undefined' && !window.__GM_AUTH_HANDLER_ATTACHED) {
    window.gm_authFailure = () => {
      // eslint-disable-next-line no-console
      console.error('Google Maps auth failure: key invalid, restricted, or billing issue.');
      const evt = new CustomEvent('gm_auth_failure');
      window.dispatchEvent(evt);
    };
    window.__GM_AUTH_HANDLER_ATTACHED = true;
  }
  const { status: mapsStatus, errorDetail: mapsScriptError } = useGoogleMaps(apiKey);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [geoSupported, setGeoSupported] = useState(true);
  const [places, setPlaces] = useState([]); // {id,name,address,location,distanceMeters}
  const [selectedId, setSelectedId] = useState('');
  const [state, setState] = useState(INITIAL_STATE);
  const markersRef = useRef([]);

  // Haversine distance (meters)
  const distanceBetween = (a, b) => {
    const toRad = d => d * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(b.lat() - a.lat());
    const dLng = toRad(b.lng() - a.lng());
    const lat1 = toRad(a.lat());
    const lat2 = toRad(b.lat());
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
  };

  const placeMarkers = useCallback((origin, list) => {
    if (!mapInstanceRef.current || !window.google) return;
    clearMarkers();
    // origin marker
    markersRef.current.push(new window.google.maps.Marker({
      map: mapInstanceRef.current,
      position: origin,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#2b6cb0',
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#fff'
      },
      title: 'Your location'
    }));
    list.forEach(p => {
      markersRef.current.push(new window.google.maps.Marker({
        map: mapInstanceRef.current,
        position: p.location,
        title: p.name
      }));
    });
  }, []);

  const runNearbySearch = useCallback(async (posLatLng) => {
    try {
      const lat = posLatLng.lat();
      const lng = posLatLng.lng();
      const body = {
        includedPrimaryTypes: ["hospital"],
        maxResultCount: 10,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 50000
          }
        }
      };
      const resp = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey || '',
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types'
        },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        let detailSnippet = '';
        try {
          const ct = resp.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const j = await resp.json();
            detailSnippet = j.error?.message || JSON.stringify(j).slice(0,180);
          } else {
            const t = await resp.text();
            detailSnippet = t.slice(0,180);
          }
        } catch(e) {
          detailSnippet = 'Unable to parse error body';
        }
        setState({ loading: false, error: `Places v1 HTTP ${resp.status}${detailSnippet?': '+detailSnippet:''}` });
        // eslint-disable-next-line no-console
        console.error('Places v1 error response:', detailSnippet);
        return;
      }
      const data = await resp.json();
      const raw = data.places || [];
      const mapped = raw.map(p => {
        const loc = p.location ? new window.google.maps.LatLng(p.location.latitude, p.location.longitude) : null;
        return {
          id: p.id,
            name: p.displayName?.text || 'Unknown',
            address: p.formattedAddress || '',
            location: loc,
    primaryType: p.primaryType,
    types: p.types || []
        };
      }).filter(p => p.location);
      // Enrich candidates with place details and then apply stricter emergency-hospital filter.
      const detailPromises = mapped.map(async candidate => {
        try {
          const detResp = await fetch(`https://places.googleapis.com/v1/places/${candidate.id}?readMask=places.types,places.displayName,places.formattedAddress,places.location,places.attributes`, {
            headers: { 'X-Goog-Api-Key': apiKey || '' }
          });
          if (!detResp.ok) return candidate;
          const det = await detResp.json();
          candidate.types = det.types || candidate.types || [];
          candidate.attributes = det.attributes || null;
          candidate.name = det.displayName?.text || candidate.name;
          candidate.address = det.formattedAddress || candidate.address;
          if (det.location) candidate.location = new window.google.maps.LatLng(det.location.latitude, det.location.longitude);
        } catch (e) {
          // ignore detail fetch errors, fall back to heuristics
          // eslint-disable-next-line no-console
          console.warn('Place details fetch failed for', candidate.id, e);
        }
        return candidate;
      });
      const enriched = await Promise.all(detailPromises);
      const emergencyNameRe = /\b(emerg|emergency|er|urgent|accident|trauma)\b/i;
      // Prefer places whose name indicates an emergency room or that have emergency attributes; then fill to 3 with nearest candidates.
      const emergencyMatches = enriched.filter(m => {
        const name = (m.name || '');
        const hasEmergencyAttr = m.attributes && (m.attributes.hasEmergencyDepartment === true || m.attributes.emergency === true);
        const nameHasEmergency = emergencyNameRe.test(name);
        return Boolean(hasEmergencyAttr || nameHasEmergency);
      });
      emergencyMatches.forEach(m => { m.distanceMeters = distanceBetween(posLatLng, m.location); });
      emergencyMatches.sort((a,b) => a.distanceMeters - b.distanceMeters);
      let top3 = emergencyMatches.slice(0,3);
      if (top3.length < 3) {
        const remaining = enriched
          .filter(e => e.location)
          .filter(e => !top3.some(t => t.id === e.id));
        remaining.forEach(m => { m.distanceMeters = distanceBetween(posLatLng, m.location); });
        remaining.sort((a,b) => a.distanceMeters - b.distanceMeters);
        const need = 3 - top3.length;
        top3 = top3.concat(remaining.slice(0, need));
      }
      setPlaces(top3);
      setSelectedId(top3[0]?.id || '');
      placeMarkers(posLatLng, top3);
      setState({ loading: false, error: null });
    } catch (e) {
      setState({ loading: false, error: 'Places v1 fetch failed' });
      // eslint-disable-next-line no-console
      console.error('Places v1 fetch exception', e);
    }
  }, [apiKey, placeMarkers]);

  // Initialize map after scripts ready & geolocation
  useEffect(() => {
    if (mapsStatus !== 'ready') return;
    if (!navigator.geolocation) {
      setGeoSupported(false);
      setState({ loading: false, error: 'Geolocation unsupported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
      const center = new window.google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });
      runNearbySearch(center);
    }, err => {
      setState({ loading: false, error: err.message });
    }, { enableHighAccuracy: true, timeout: 10000 });
  }, [mapsStatus, runNearbySearch]);

  const handleSelect = e => setSelectedId(e.target.value);

  // Detect Google Maps default error overlay (it injects a div with class gm-style and an error message child)
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapsStatus !== 'ready') return;
    const observer = new MutationObserver(() => {
      const errNode = mapRef.current.querySelector('div[style*="text-align: center"], .gm-err-message');
      if (errNode && !state.error) {
        setState(s => ({ ...s, loading: false, error: errNode.textContent || 'Maps internal error' }));
      }
    });
    observer.observe(mapRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [mapsStatus, state.error]);

  return (
    <div className="hospitals-map-section">
      {!apiKey && <div className="small text-danger">Missing Google Maps API key</div>}
      {mapsStatus === 'error' && (
        <div className="small text-danger">
          Failed to load Google Maps script{mapsScriptError === 'network-or-blocked' ? ' (network/ad-block?)' : ''}.
        </div>
      )}
      {mapsStatus === 'loading' && <div className="small text-muted">Loading map library…</div>}
      {state.loading && mapsStatus === 'ready' && <div className="small text-muted">Locating…</div>}
  {state.error && <div className="small text-danger">{state.error}</div>}
  {/* Auth failure specific message */}
  <AuthFailureNotice />
      {/* Helpful hints in dev */}
      {process.env.NODE_ENV !== 'production' && mapsStatus === 'ready' && !apiKey && (
        <div className="small text-muted">Set REACT_APP_GOOGLE_MAPS_API_KEY in .env and restart dev server.</div>
      )}
      {places.length > 0 && (
        <div className="hospital-list mb-2">
          <ul className="list-unstyled mb-2">
            {places.map(p => (
              <li key={p.id} className="mb-2">
                <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: '0.65rem', color: '#444' }}>{(p.distanceMeters/1000).toFixed(2)} km</div>
              </li>
            ))}
          </ul>
            <div className="mb-1 pt-4" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#01569d' }}>What hospital would you like to go to?</div>
            <select className="form-control form-control-sm" value={selectedId} onChange={handleSelect}>
              {places.map(p => (
                <option key={p.id} value={p.id} style={{ fontSize: '1rem' }}>{p.name}</option>
              ))}
            </select>
        </div>
      )}
      <div className="hospital-map-wrapper">
        <div ref={mapRef} className="hospital-map" />
      </div>
    </div>
  );
}

function AuthFailureNotice() {
  const [authFail, setAuthFail] = useState(false);
  useEffect(() => {
    const handler = () => setAuthFail(true);
    window.addEventListener('gm_auth_failure', handler);
    return () => window.removeEventListener('gm_auth_failure', handler);
  }, []);
  if (!authFail) return null;
  return (
    <div className="small text-danger mt-1">
      Google Maps authentication failed. Likely causes:
      <ul className="mb-0 pl-3 small">
  <li>Referrer not allowed (add http://localhost:3000/*).</li>
  <li>Maps JavaScript API not enabled (separate from Places API (New)).</li>
  <li>Billing not enabled for project.</li>
  <li>Using wrong key/project (project mismatch).</li>
  <li>Recently changed restrictions (wait 2–3 minutes then hard refresh).</li>
      </ul>
    </div>
  );
}

