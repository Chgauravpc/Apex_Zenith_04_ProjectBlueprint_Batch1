import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Capture from '../../pages/Capture';
import NoteEditor from './NoteEditor';
import * as captureApi from '../../api/capture';

vi.mock('../../api/capture', () => ({
  captureText: vi.fn(),
  captureVoice: vi.fn(),
  captureVideo: vi.fn(),
  captureHandwritten: vi.fn(),
  pollJob: vi.fn(),
}));

describe('Capture page and components (T18)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all capture tabs and switches to Text note tab', () => {
    render(<Capture />);

    expect(screen.getByText('Voice Note')).toBeDefined();
    expect(screen.getByText('Text & Params')).toBeDefined();
    expect(screen.getByText('Handwritten / Photo')).toBeDefined();
    expect(screen.getByText('Setup Video')).toBeDefined();

    // Switch to Text note tab
    const textTab = screen.getByText('Text & Params');
    fireEvent.click(textTab);

    expect(screen.getByPlaceholderText(/VMC-3 pe roughing karte waqt/i)).toBeDefined();
    expect(screen.getByText('Save & Check Note')).toBeDefined();
  });

  it('submits typed note in NoteEditor and displays extracted know-how cards', async () => {
    captureApi.captureText.mockResolvedValueOnce({
      transcript: 'VMC-3 chatter test',
      cards: [
        {
          id: 10,
          symptom: 'Spindle chatter',
          action: 'Reduce feed from 0.28 to 0.20 mm/rev',
          why: 'Prevents tool tip chipping on SS304',
          confidence: 0.95,
        },
      ],
      guardian_result: {
        severity: 'caution',
        warnings: [{ message: 'Feed approaching upper safety limit' }],
      },
    });

    render(<NoteEditor />);

    const textarea = screen.getByPlaceholderText(/VMC-3 pe roughing karte waqt/i);
    fireEvent.change(textarea, { target: { value: 'VMC-3 feed reduction test' } });

    const submitBtn = screen.getByText('Save & Check Note');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(captureApi.captureText).toHaveBeenCalledTimes(1);
    });

    // Check extracted card display
    await waitFor(() => {
      expect(screen.getByText('Spindle chatter')).toBeDefined();
      expect(screen.getByText('Reduce feed from 0.28 to 0.20 mm/rev')).toBeDefined();
      expect(screen.getByText('CAUTION — RISK DETECTED')).toBeDefined();
    });
  });
});
