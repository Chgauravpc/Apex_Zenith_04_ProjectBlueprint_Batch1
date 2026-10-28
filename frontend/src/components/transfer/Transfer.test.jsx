import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Handover from '../../pages/Handover';
import Review from '../../pages/Review';
import * as captureApi from '../../api/capture';
import * as transferApi from '../../api/transfer';
import { DEMO_USERS, useAuthStore } from '../../store/useAuthStore';

vi.mock('../../api/capture', () => ({
  reviewCard: vi.fn(),
  getReviewQueue: vi.fn(),
  transcribe: vi.fn(),
}));
vi.mock('../../api/transfer', () => ({
  getRisk: vi.fn(),
  getHandoverPlan: vi.fn(),
  startInterview: vi.fn(),
  answerInterview: vi.fn(),
  getRoutedQuestions: vi.fn(),
  replyRoutedQuestion: vi.fn(),
}));

const [RAMESH, PRIYA] = DEMO_USERS;

const PLAN = {
  id: 1, employee_id: 1, employee: 'Ramesh Patil', exit_date: '2027-05-29', days_left: 213,
  status: 'active', progress: 33, sole_holder_machines: ['VMC-3'], gaps: [],
  tasks: [
    { id: 1, title: 'Record a setup video on VMC-3', category: 'record_setup', status: 'done', machine_id: 1, component_id: null },
    { id: 2, title: 'AI interview: what only you know about VMC-3', category: 'interview', status: 'todo', machine_id: 1, component_id: null },
  ],
};
const RISK = [
  {
    machine_id: 1, component_id: 1, name: 'VMC-3 · Spindle', cards: 9, holders: 1, bus: 0, coverage: 100,
    expert: 'Ramesh Patil', expert_id: 1, expert_leaving_on: '2027-05-29', status: 'critical',
  },
];
const CARD = {
  id: 31, title: 'Cleaned coolant nozzle', machine_id: 1, component_id: 4, symptom: 'poor_finish',
  context: null, action: 'Nozzle was blocked, cleaned it and finish improved.', why: null, params: {},
  confidence: 0.6, author_id: 2, verified_by_id: null, unofficial: false,
  machine: 'VMC-3', component: 'Coolant nozzle', author: 'Priya Shinde',
};

const renderHandover = () =>
  render(
    <MemoryRouter>
      <Handover />
    </MemoryRouter>
  );

describe('Transfer & Review components (T23)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ currentUser: RAMESH });
    transferApi.getRisk.mockResolvedValue(RISK);
    transferApi.getHandoverPlan.mockResolvedValue(PLAN);
    transferApi.getRoutedQuestions.mockResolvedValue({ items: [], total: 0 });
    captureApi.getReviewQueue.mockResolvedValue({ items: [CARD], total: 1, limit: 50, offset: 0 });
  });

  it('renders the leaving employee’s real handover plan', async () => {
    renderHandover();

    expect(screen.getByText(/Handover Plan & Countdown/i)).toBeDefined();
    expect(await screen.findByText(/Ramesh Patil • Retirement Countdown/i)).toBeDefined();
    expect(screen.getByText('VMC-3 · Spindle')).toBeDefined();
    expect(screen.getByText(/Transfer Milestone Tasks \(1\/2 Complete\)/i)).toBeDefined();
    expect(transferApi.getHandoverPlan).toHaveBeenCalledWith(1, expect.anything());
  });

  it('runs an interview: question from the API, answer saved as a verified card', async () => {
    transferApi.startInterview.mockResolvedValue({
      id: 9, employee_id: 1, machine_id: 1, status: 'open', mode: 'live',
      questions: [
        { id: 0, text: 'How do you know the spindle bearing is going?', reason: 'Nothing recorded yet about the spindle', answered: false },
      ],
    });
    transferApi.answerInterview.mockResolvedValue({
      session_id: 9, question_id: 0, remaining: 0,
      card: { ...CARD, id: 50, title: 'Spindle bearing sound', action: 'Listen for a growl at 3000 rpm' },
    });
    renderHandover();

    fireEvent.click(await screen.findByText(/AI Tacit Interview/i));
    fireEvent.click(await screen.findByText(/Start Interview/i));
    expect(await screen.findByText(/How do you know the spindle bearing is going/i)).toBeDefined();

    fireEvent.change(screen.getByLabelText(/Your Answer/i), { target: { value: 'Growl at 3000 rpm' } });
    fireEvent.click(screen.getByText(/Save & Publish Card/i));

    expect(await screen.findByText('Spindle bearing sound')).toBeDefined();
    expect(transferApi.answerInterview).toHaveBeenCalledWith(9, { question_id: 0, answer_text: 'Growl at 3000 rpm' });
    expect(screen.getByText(/Verified by Ramesh/i)).toBeDefined();
  });

  it('replies to a routed question and shows a real error when saving fails', async () => {
    transferApi.getRoutedQuestions.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 4, question: 'Lathe-2 par turret knock kyu aata hai?', status: 'open', machine_id: 3,
          machine: 'Lathe-2', asked_by_id: 2, asked_by: 'Priya Shinde', routed_to_id: 1,
          routed_to: 'Ramesh Patil', answer_card_id: null, created_at: '2026-10-27T11:30:00',
        },
      ],
    });
    transferApi.replyRoutedQuestion.mockRejectedValueOnce(new Error('database is locked'));
    renderHandover();

    fireEvent.click(screen.getByText(/Routed Questions/i));
    fireEvent.click(await screen.findByText(/Reply to Priya/i));
    fireEvent.change(screen.getByPlaceholderText(/Type your advice/i), { target: { value: 'Check the cam gap' } });
    fireEvent.click(screen.getByText(/Send Verified Reply/i));

    expect(await screen.findByText(/Reply not saved: database is locked/i)).toBeDefined();
    expect(screen.queryByText(/verified locally/i)).toBeNull();
  });

  it('review: edits a card and sends the payload the backend expects', async () => {
    captureApi.reviewCard.mockResolvedValueOnce({
      outcome: 'verified',
      card: { ...CARD, action: 'Clean nozzle every shift', verified_by_id: 1 },
    });
    render(<Review />);

    expect(await screen.findByText(/Cleaned coolant nozzle/i)).toBeDefined();
    expect(screen.getByText(/1 Cards Pending Verification/i)).toBeDefined();

    fireEvent.click(screen.getByText(/Edit Details/i));
    const [actionBox] = screen.getAllByRole('textbox');
    fireEvent.change(actionBox, { target: { value: 'Clean nozzle every shift' } });
    fireEvent.click(screen.getByText(/Save Changes & Approve/i));

    await waitFor(() => expect(captureApi.reviewCard).toHaveBeenCalledTimes(1));
    expect(captureApi.reviewCard).toHaveBeenCalledWith(31, {
      reviewer_id: 1,
      action: 'edit',
      action_text: 'Clean nozzle every shift',
      why: null,
    });
    expect(await screen.findByText(/Card #31 was verified/i)).toBeDefined();
    expect(screen.getByText(/0 Cards Pending Verification/i)).toBeDefined();
  });

  it('review: a failed save is reported, never shown as verified', async () => {
    captureApi.reviewCard.mockRejectedValueOnce(new Error('only an old employee or a supervisor can verify'));
    render(<Review />);

    fireEvent.click(await screen.findByText(/Approve & Verify/i));

    expect(await screen.findByText(/Card #31 was not saved/i)).toBeDefined();
    expect(screen.queryByText(/verified locally/i)).toBeNull();
    expect(screen.getByText(/1 Cards Pending Verification/i)).toBeDefined();
  });

  it('review: new employees can read the queue but not verify', async () => {
    useAuthStore.setState({ currentUser: PRIYA });
    render(<Review />);

    const approve = (await screen.findByText(/Approve & Verify/i)).closest('button');
    expect(approve.disabled).toBe(true);
    expect(screen.getByText(/Only an old employee or a supervisor can verify/i)).toBeDefined();
  });
});
