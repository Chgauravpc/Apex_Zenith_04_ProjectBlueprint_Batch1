import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Ask from '../../pages/Ask';
import AnswerCard from './AnswerCard';

vi.mock('../../api/ask', () => ({
  askQuestion: vi.fn(),
  askVoice: vi.fn(),
  askChatter: vi.fn(),
  askChips: vi.fn(),
  submitFeedback: vi.fn(),
}));

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
});
