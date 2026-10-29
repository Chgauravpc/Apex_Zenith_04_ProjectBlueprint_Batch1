import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PinForm from './PinForm';
import { DEMO_USERS, useAuthStore } from '../../store/useAuthStore';
import { VMC_COMPONENTS_DATA } from '../../api/map3d';

const spindle = VMC_COMPONENTS_DATA.find((c) => c.mesh_name === 'spindle');

describe('PinForm author', () => {
  afterEach(() => useAuthStore.setState({ currentUser: DEMO_USERS[0] }));

  it('pins as the logged-in user and leaves the note unverified for review', async () => {
    const priya = DEMO_USERS.find((u) => u.role === 'new_employee');
    useAuthStore.setState({ currentUser: priya });
    const onSubmit = vi.fn(() => Promise.resolve());

    render(<PinForm component={spindle} isOpen onClose={() => {}} onSubmit={onSubmit} />);
    expect(screen.getByText(priya.name)).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/Flange vibration/), {
      target: { value: 'Spindle warms slowly' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Explain the symptom/), {
      target: { value: 'Run it 10 minutes at 2000 rpm first.' },
    });
    fireEvent.submit(screen.getByPlaceholderText(/Flange vibration/).closest('form'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      author_id: priya.id,
      author: priya.name,
      verified: false,
    });
  });
});
