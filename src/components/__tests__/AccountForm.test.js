import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AccountForm from '../AccountForm';
import '@testing-library/jest-dom/extend-expect';

// Mock Auth0 hook
jest.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({ user: { sub: 'auth0|123', name: 'Jane Doe' } })
}));

// Mock localStorage
const store = {};
beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; }
  },
});

test('renders and saves profile data', () => {
  render(<AccountForm />);
  const firstName = screen.getByLabelText(/First Name/i);
  fireEvent.change(firstName, { target: { value: 'Alice' } });
  fireEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(screen.getByText(/Saved\./i)).toBeInTheDocument();
});
