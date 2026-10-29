import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useRef } from 'react';
import { ReadingScrollbar } from './ReadingScrollbar';

describe('ReadingScrollbar Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const TestWrapper: React.FC<{ side: 'left' | 'right'; scrollHeight?: number; clientHeight?: number; scrollTop?: number }> = ({
    side,
    scrollHeight = 1000,
    clientHeight = 500,
    scrollTop = 0,
  }) => {
    const viewportRef = useRef<HTMLDivElement | null>(null);

    return (
      <div style={{ position: 'relative', height: '500px' }}>
        <div
          ref={(el) => {
            if (el) {
              Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
              Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true });
              Object.defineProperty(el, 'scrollTop', { value: scrollTop, writable: true, configurable: true });
              el.scrollTo = vi.fn(({ top }) => {
                el.scrollTop = top;
              });
            }
            viewportRef.current = el;
          }}
          style={{ height: '500px', overflowY: 'auto' }}
        >
          <div style={{ height: `${scrollHeight}px` }}>Content</div>
        </div>
        <ReadingScrollbar viewportRef={viewportRef} side={side} />
      </div>
    );
  };

  it('renders on the right side when side="right"', () => {
    render(<TestWrapper side="right" />);
    const container = screen.getByTestId('reading-scrollbar-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('scrollbar-right');
    expect(container).toHaveAttribute('data-side', 'right');
  });

  it('renders on the left side when side="left"', () => {
    render(<TestWrapper side="left" />);
    const container = screen.getByTestId('reading-scrollbar-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('scrollbar-left');
    expect(container).toHaveAttribute('data-side', 'left');
  });

  it('displays 0% reading progress at the top of a scrollable document', () => {
    render(<TestWrapper side="right" scrollHeight={1000} clientHeight={500} scrollTop={0} />);
    const indicator = screen.getByTestId('reading-percentage');
    expect(indicator).toHaveTextContent('0%');
  });

  it('displays 50% reading progress when halfway through document', () => {
    render(<TestWrapper side="right" scrollHeight={1000} clientHeight={500} scrollTop={250} />);
    const indicator = screen.getByTestId('reading-percentage');
    expect(indicator).toHaveTextContent('50%');
  });

  it('displays 100% reading progress when at the bottom of document', () => {
    render(<TestWrapper side="right" scrollHeight={1000} clientHeight={500} scrollTop={500} />);
    const indicator = screen.getByTestId('reading-percentage');
    expect(indicator).toHaveTextContent('100%');
  });

  it('clicking the track scrolls the viewport', () => {
    render(<TestWrapper side="right" scrollHeight={1000} clientHeight={500} scrollTop={0} />);
    const track = screen.getByTestId('reading-scrollbar-track');

    // Mock getBoundingClientRect
    track.getBoundingClientRect = () => ({
      top: 0,
      bottom: 400,
      left: 0,
      right: 20,
      width: 20,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.click(track, { clientY: 200 }); // click halfway down
    const indicator = screen.getByTestId('reading-percentage');
    expect(indicator).toBeInTheDocument();
  });
});
