import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Handover from '../../pages/Handover';
import Review from '../../pages/Review';
import * as captureApi from '../../api/capture';

vi.mock('../../api/capture', () => ({
  reviewCard: vi.fn(),
  getReviewQueue: vi.fn(),
}));

describe('Transfer & Review components (T23)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Handover page with retirement countdown and bus-factor-1 components', () => {
    render(<Handover />);

    expect(screen.getByText(/Handover Plan & Countdown/i)).toBeDefined();
    expect(screen.getByText(/Retirement Countdown/i)).toBeDefined();
    expect(screen.getByText(/VMC-3 Spindle Bearing & Drawbar/i)).toBeDefined();
    expect(screen.getByText(/Transfer Milestone Tasks/i)).toBeDefined();
  });

  it('renders Review queue, edits a card, and approves verification', async () => {
    captureApi.reviewCard.mockResolvedValueOnce({
      id: 501,
      verified_by: 1,
      status: 'approved',
    });

    render(<Review />);

    expect(screen.getByText(/Cards Pending Verification/i)).toBeDefined();
    expect(screen.getByText(/Intermittent chatter during roughing pass/i)).toBeDefined();

    // Click Edit Details
    const editButtons = screen.getAllByText(/Edit Details ✏️/i);
    fireEvent.click(editButtons[0]);

    // Check inline edit form appears
    expect(screen.getByText(/Correct Action:/i)).toBeDefined();
    expect(screen.getByText(/Save Changes & Approve ✓/i)).toBeDefined();

    // Click Save Changes & Approve
    const saveApproveBtn = screen.getByText(/Save Changes & Approve ✓/i);
    fireEvent.click(saveApproveBtn);

    await waitFor(() => {
      expect(captureApi.reviewCard).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/Card #501 was verified/i)).toBeDefined();
    });
  });
});
