import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { createRef } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  LoadState,
} from './index';

describe('Design System Primitives (Milestone 1)', () => {
  describe('Button component', () => {
    it('renders with default primary maroon variant and handles click', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Submit Action</Button>);

      const btn = screen.getByRole('button', { name: /Submit Action/i });
      expect(btn).toBeDefined();
      expect(btn.className).toContain('bg-maroon-800');
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders secondary variant and touch-target classes', () => {
      render(<Button variant="secondary">Cancel</Button>);
      const btn = screen.getByRole('button', { name: /Cancel/i });
      expect(btn.className).toContain('bg-white');
      expect(btn.className).toContain('btn-touch');
    });

    it('shows loading spinner and disables interactions when isLoading is true', () => {
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Saving
        </Button>
      );
      const btn = screen.getByRole('button');
      expect(btn.getAttribute('aria-busy')).toBe('true');
      expect(btn.hasAttribute('disabled')).toBe(true);
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Card primitives', () => {
    it('renders card with header, title, description, content, and footer', () => {
      render(
        <Card hoverable data-testid="test-card">
          <CardHeader>
            <CardTitle>Spindle Maintenance</CardTitle>
            <CardDescription>Routine bearing inspection guide</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Ensure lubrication levels are checked before running.</p>
          </CardContent>
          <CardFooter>
            <button type="button">Mark Done</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Spindle Maintenance')).toBeDefined();
      expect(screen.getByText('Routine bearing inspection guide')).toBeDefined();
      expect(screen.getByText(/Ensure lubrication levels/i)).toBeDefined();
      expect(screen.getByText('Mark Done')).toBeDefined();

      const card = screen.getByTestId('test-card');
      expect(card.className).toContain('bg-white');
      expect(card.className).toContain('border-[#DADCE0]');
    });
  });

  describe('Badge component', () => {
    it('renders maroon default badge with dot indicator', () => {
      render(
        <Badge variant="maroon" dot>
          Verified Expert
        </Badge>
      );
      expect(screen.getByText('Verified Expert')).toBeDefined();
    });

    it('renders semantic status badges correctly', () => {
      const { rerender } = render(<Badge variant="safe">BF ≥ 2</Badge>);
      expect(screen.getByText('BF ≥ 2').className).toContain('bg-emerald-50');

      rerender(<Badge variant="caution">BF = 1</Badge>);
      expect(screen.getByText('BF = 1').className).toContain('bg-amber-50');

      rerender(<Badge variant="critical">BF = 0</Badge>);
      expect(screen.getByText('BF = 0').className).toContain('bg-rose-50');
    });
  });

  describe('Input component', () => {
    it('renders with label, placeholder, and forwards input ref', () => {
      const inputRef = createRef();
      render(
        <Input
          ref={inputRef}
          label="Procedure Step"
          placeholder="Enter step title"
        />
      );

      const input = screen.getByLabelText('Procedure Step');
      expect(input).toBeDefined();
      expect(inputRef.current).toBe(input);
      expect(input.getAttribute('placeholder')).toBe('Enter step title');
    });

    it('renders error message with alert role and aria-invalid', () => {
      render(
        <Input
          label="RPM Measurement"
          error="Value exceeds maximum safety tolerance of 3500 RPM"
        />
      );

      const input = screen.getByLabelText('RPM Measurement');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('Value exceeds maximum safety tolerance');
    });
  });

  describe('Tabs primitives', () => {
    it('switches between tabs and shows active tab panel content', () => {
      render(
        <Tabs defaultValue="voice">
          <TabsList aria-label="Input formats">
            <TabsTrigger value="voice">Voice Note</TabsTrigger>
            <TabsTrigger value="text">Text Params</TabsTrigger>
          </TabsList>
          <TabsContent value="voice">
            <p>Voice recording canvas</p>
          </TabsContent>
          <TabsContent value="text">
            <p>Structured note form</p>
          </TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Voice recording canvas')).toBeDefined();
      expect(screen.queryByText('Structured note form')).toBeNull();

      fireEvent.click(screen.getByRole('tab', { name: /Text Params/i }));
      expect(screen.getByText('Structured note form')).toBeDefined();
      expect(screen.queryByText('Voice recording canvas')).toBeNull();
    });
  });

  describe('Dialog primitive', () => {
    it('renders when open and handles escape key to close', () => {
      const handleClose = vi.fn();
      const { rerender } = render(
        <Dialog
          isOpen={true}
          onClose={handleClose}
          title="Confirm Sign-off"
          description="Are you sure you want to verify this know-how?"
        >
          <p>Dialog body text</p>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('Confirm Sign-off')).toBeDefined();
      expect(screen.getByText('Dialog body text')).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      rerender(
        <Dialog isOpen={false} onClose={handleClose} title="Confirm Sign-off">
          <p>Dialog body text</p>
        </Dialog>
      );
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('LoadState component', () => {
    it('renders loading state with label and spinner', () => {
      render(<LoadState loading={true} label="Fetching knowledge graph…" />);
      expect(screen.getByText('Fetching knowledge graph…')).toBeDefined();
    });

    it('renders error alert with message and retry button', () => {
      const handleRetry = vi.fn();
      render(
        <LoadState
          loading={false}
          error="Network timeout on port 8000"
          onRetry={handleRetry}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('Could not load: Network timeout on port 8000');
      const retryBtn = screen.getByRole('button', { name: /Retry/i });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });
});
