// Utility to generate fake appointments for demo/testing
const SEVERITIES = ['Minimal', 'Mild', 'Moderate', 'Concerning', 'Critical'];

const INJURIES_BY_SEVERITY = {
  Minimal: ['Minor cut', 'Small bruise', 'Mild headache'],
  Mild: ['Sprained wrist', 'Mild fracture', 'Deep cut needing stitches'],
  Moderate: ['Broken arm', 'Deep laceration', 'Concussion'],
  Concerning: ['Difficulty breathing', 'Severe abdominal pain', 'Large head injury'],
  Critical: ['Unconscious', 'Severe bleeding', 'Chest pain / possible heart attack']
};

function weightedChoice(weights) {
  const sum = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return weights.length - 1;
}

/**
 * Generate back-to-back appointments for a single day.
 * date can be a Date or an ISO date string; time component is ignored.
 * Each appointment will include: summary, description, start (ISO), end (ISO), severity.
 */
export function generateDailyAppointments(date = new Date(), options = {}) {
  const { startHour = 8, endHour = 18, slotMinutes = 20 } = options;
  const day = typeof date === 'string' ? new Date(date) : new Date(date);
  // normalize to local day start
  day.setHours(0, 0, 0, 0);

  const appointments = [];
  let cursor = new Date(day);
  cursor.setHours(startHour, 0, 0, 0);

  // weight distribution: more low-severity than critical
  const severityWeights = [30, 25, 20, 15, 10];

  while (cursor.getHours() < endHour || (cursor.getHours() === endHour && cursor.getMinutes() === 0)) {
    const idx = weightedChoice(severityWeights);
    const severity = SEVERITIES[idx];
    const injuries = INJURIES_BY_SEVERITY[severity] || ['Injury'];
    const injury = injuries[Math.floor(Math.random() * injuries.length)];

    const start = new Date(cursor);
    const end = new Date(start.getTime() + slotMinutes * 60 * 1000);

    appointments.push({
      summary: `ER intake: ${injury}`,
      description: `Patient arriving with ${injury}. Severity: ${severity}`,
      start: start.toISOString(),
      end: end.toISOString(),
      severity,
    });

    cursor = end; // back-to-back
    // safety: avoid infinite loop
    if (appointments.length > 500) break;
  }

  return appointments;
}

/**
 * Convenience: generate appointments keyed by ISO date string (YYYY-MM-DD)
 */
export function generateAppointmentsByDate(date = new Date(), opts) {
  const day = typeof date === 'string' ? new Date(date) : new Date(date);
  const iso = day.toISOString().slice(0, 10);
  return { [iso]: generateDailyAppointments(day, opts) };
}

/** Export a sample set for today */
export const sampleAppointmentsToday = generateDailyAppointments(new Date());

export default { generateDailyAppointments, generateAppointmentsByDate, sampleAppointmentsToday };
