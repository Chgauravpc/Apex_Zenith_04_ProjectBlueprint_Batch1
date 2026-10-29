import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlaybookLink, { playbookUrl } from './PlaybookLink';

describe('PlaybookLink', () => {
  it('opens the printable playbook of the machine in a new tab', () => {
    render(<PlaybookLink machineId={1} machineName="VMC-3" />);
    const link = screen.getByRole('link', { name: /VMC-3 Playbook/ });
    expect(link.getAttribute('href')).toBe(playbookUrl(1));
    expect(link.getAttribute('href')).toMatch(/\/api\/reports\/handbook\/1$/);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('shows nothing until the machine is known', () => {
    const { container } = render(<PlaybookLink machineId={null} />);
    expect(container.innerHTML).toBe('');
  });
});
