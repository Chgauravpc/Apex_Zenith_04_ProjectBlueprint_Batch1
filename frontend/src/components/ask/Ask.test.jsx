import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Ask from '../../pages/Ask';
import AnswerCard from './AnswerCard';
import ChatWindow from './ChatWindow';
import ChatterDoctor from './ChatterDoctor';
import * as askApi from '../../api/ask';
import * as transferApi from '../../api/transfer';

vi.mock('../../api/ask', () => ({
  askQuestion: vi.fn(),
  askVoice: vi.fn(),
  askChatter: vi.fn(),
  askChips: vi.fn(),
  submitFeedback: vi.fn(),
}));

vi.mock('../../api/transfer', () => ({ routeQuestion: vi.fn() }));
vi.mock('../../api/machines', () => ({ getMachines: vi.fn().mockResolvedValue([]) }));
vi.mock('../../utils/audio', () => ({ toWav: vi.fn() }));

describe('Ask page and components (T20)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all Ask tabs and switches between Chat, Chatter, and Chips', () => {
    render(<Ask />);

    expect(screen.getByText('Grounded Q&A Chat')).toBeDefined();
    expect(screen.getByText('Chatter Doctor (Acoustic)')).toBeDefined();
    expect(screen.getByText('Chip Colour Reader (Thermal)')).toBeDefined();

    // Switch to Chatter Doctor
    fireEvent.click(screen.getByText('Chatter Doctor (Acoustic)'));
    expect(screen.getByText(/Chatter Doctor — Acoustic RPM Sweet-Spot Finder/i)).toBeDefined();

    // Switch to Chip Reader
    fireEvent.click(screen.getByText('Chip Colour Reader (Thermal)'));
    expect(screen.getByText(/Chip Colour Reader — Cutting Temperature Doctor/i)).toBeDefined();
  });

  it('renders AnswerCard with grounded citations and action steps', () => {
    const mockAnswer = {
      answer: 'Reduce roughing feed to 0.18 mm/rev and check tool holder clamp torque.',
      steps: [
        'Stop machine spindle and inspect insert tip for wear.',
        'Torque collet nut to 90 Nm using torque wrench.',
      ],
      watch_out: 'Excessive spindle runout will cause chatter repetition.',
      confidence: 0.94,
      sources: [
        {
          id: 101,
          kind: 'Know-How Card',
          author: 'Ramesh Sharma',
          snippet: 'VMC-3 chatter reduced after torquing ER32 collet to 90 Nm.',
          verified: true,
        },
      ],
    };

    render(<AnswerCard answer={mockAnswer} />);

    expect(screen.getByText(/Reduce roughing feed to 0.18 mm\/rev/i)).toBeDefined();
    expect(screen.getByText(/Step 1:/i)).toBeDefined();
    expect(screen.getByText(/Watch Out:/i)).toBeDefined();
    expect(screen.getByText(/#101 Know-How Card/i)).toBeDefined();
    expect(screen.getByText(/Ramesh Sharma/i)).toBeDefined();
    expect(screen.getByText(/Confidence 94%/i)).toBeDefined();
  });

  it('renders Not Enough Data alert with Ask Expert button when flagged', () => {
    const mockUncertainAnswer = {
      not_enough_data: true,
      suggested_expert: 'Ramesh (Old Employee)',
      confidence: 0.2,
      sources: [],
    };

    const onAskExpert = vi.fn();
    render(<AnswerCard answer={mockUncertainAnswer} onAskExpert={onAskExpert} />);

    expect(screen.getByText(/Not Enough Verified Data on Shop Floor/i)).toBeDefined();
    const btn = screen.getByText(/Ask Ramesh/i);
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(onAskExpert).toHaveBeenCalledTimes(1);
  });

  it('routes an unanswered question to the suggested expert', async () => {
    askApi.askQuestion.mockResolvedValueOnce({
      query_id: 7, question: 'helix angle?', answer: '', steps: [], sources: [], experts: [],
      not_enough_data: true, suggested_expert: 'Ramesh Patil', confidence: 0, mode: 'live',
      search_mode: 'semantic',
    });
    transferApi.routeQuestion.mockResolvedValueOnce({ id: 3, routed_to: 'Ramesh Patil' });
    render(<ChatWindow />);

    fireEvent.change(screen.getByPlaceholderText(/Ask anything/i), { target: { value: 'helix angle?' } });
    fireEvent.click(screen.getByText('Ask'));
    fireEvent.click(await screen.findByText(/Ask Ramesh Patil →/));

    await waitFor(() => expect(transferApi.routeQuestion).toHaveBeenCalledWith(7));
    expect(askApi.askQuestion).toHaveBeenCalledWith(expect.objectContaining({ asked_by_id: expect.any(Number) }));
    expect(await screen.findByText(/Sent to Ramesh Patil/)).toBeDefined();
  });

  it('shows no expert to route to instead of inventing one', () => {
    render(<AnswerCard answer={{ not_enough_data: true, suggested_expert: null, sources: [] }} onAskExpert={vi.fn()} />);
    expect(screen.getByText(/no expert to route it to/i)).toBeDefined();
    expect(screen.queryByText(/Ramesh/)).toBeNull();
  });

  it('Chatter Doctor shows only what the analysis found', async () => {
    askApi.askChatter.mockResolvedValueOnce({
      fc: 612.4, clear_chatter: false, prominence: 1.4, teeth: 4, current_rpm: 3000, rpm_min: 500,
      rpm_max: 12000, candidate_rpms: [9186, 4593], nearest_rpm: 4593, formula: 'RPM = 60 × fc / (N × k)',
      explanation: 'No clear chatter peak in this recording.', expert_card: null,
    });
    render(<ChatterDoctor />);
    const wav = new File(['RIFF'], 'cut.wav', { type: 'audio/wav' });
    fireEvent.change(document.getElementById('audio-upload'), { target: { files: [wav] } });
    fireEvent.click(screen.getByText(/Diagnose Chatter/i));

    expect(await screen.findByText(/Dominant Frequency: 612 Hz/)).toBeDefined();
    expect(screen.getByText(/no clear chatter\)/)).toBeDefined();
    expect(screen.getByText('No clear chatter peak in this recording.')).toBeDefined();
    expect(screen.getByText('9186')).toBeDefined();
    expect(screen.queryByText('12810')).toBeNull(); // the old hard-coded fallback is gone
  });
});
