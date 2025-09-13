import React from 'react';
import { render, screen } from '@testing-library/react';
import HospitalsMap from '../HospitalsMap';

// Ensure no real API key in test env
process.env.REACT_APP_GOOGLE_MAPS_API_KEY = '';

describe('HospitalsMap', () => {
  it('shows missing key message when no API key', () => {
    render(<HospitalsMap />);
  const el = screen.getByText(/Missing Google Maps API key/i);
  expect(el).toBeTruthy();
  });
});
