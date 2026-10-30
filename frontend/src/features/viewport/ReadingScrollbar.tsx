import React, { useEffect, useState, useRef, useCallback } from 'react';
import './reading-scrollbar.css';

export interface ReadingScrollbarProps {
  viewportRef: React.RefObject<HTMLElement | null>;
  side: 'left' | 'right';
}

export const ReadingScrollbar: React.FC<ReadingScrollbarProps> = ({
  viewportRef,
  side,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [thumbTop, setThumbTop] = useState<number>(0);
  const [thumbHeight, setThumbHeight] = useState<number>(40);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStartYRef = useRef<number>(0);
  const dragStartScrollTopRef = useRef<number>(0);

  const resolveTarget = useCallback((): HTMLElement | null => {
    if (viewportRef.current) return viewportRef.current;
    if (typeof document !== 'undefined') {
      return (
        document.querySelector<HTMLElement>('.markdown-content') ||
        document.querySelector<HTMLElement>('.markdown-viewport')
      );
    }
    return null;
  }, [viewportRef]);

  const updateScroll = useCallback(() => {
    const el = resolveTarget();
    const track = trackRef.current;
    if (!el) return;

    const { scrollTop = 0, scrollHeight = 0, clientHeight = 0 } = el;
    const maxScroll = scrollHeight - clientHeight;
    const trackHeight = track && track.clientHeight > 0 ? track.clientHeight : (clientHeight || 300);

    if (maxScroll <= 0) {
      setProgress(0);
      setThumbTop(0);
      setThumbHeight(trackHeight);
      return;
    }

    const currentPercent = Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100)));
    setProgress(currentPercent);

    const calculatedThumbHeight = Math.max(28, Math.round((clientHeight / scrollHeight) * trackHeight));
    const availableTrack = Math.max(1, trackHeight - calculatedThumbHeight);
    const currentThumbTop = Math.round((scrollTop / maxScroll) * availableTrack);

    setThumbHeight(calculatedThumbHeight);
    setThumbTop(currentThumbTop);
  }, [resolveTarget]);

  useEffect(() => {
    let attachedEl: HTMLElement | null = null;
    let ro: ResizeObserver | null = null;

    const attach = () => {
      const el = resolveTarget();
      if (!el) return false;
      attachedEl = el;
      updateScroll();
      el.addEventListener('scroll', updateScroll, { passive: true });
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => updateScroll());
        ro.observe(el);
      }
      return true;
    };

    attach();
    const frameId = requestAnimationFrame(() => {
      if (!attachedEl) {
        attach();
      } else {
        updateScroll();
      }
    });

    const handleCaptureScroll = (e: Event) => {
      const el = resolveTarget();
      if (e.target === el || (el && el.contains(e.target as Node))) {
        updateScroll();
      }
    };

    window.addEventListener('scroll', handleCaptureScroll, { capture: true, passive: true });
    window.addEventListener('resize', updateScroll);

    return () => {
      cancelAnimationFrame(frameId);
      if (attachedEl) {
        attachedEl.removeEventListener('scroll', updateScroll);
      }
      ro?.disconnect();
      window.removeEventListener('scroll', handleCaptureScroll, { capture: true });
      window.removeEventListener('resize', updateScroll);
    };
  }, [resolveTarget, updateScroll]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== trackRef.current) return;
    const el = resolveTarget();
    const track = trackRef.current;
    if (!el || !track) return;

    const rect = track.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, clickY / track.clientHeight));
    const maxScroll = el.scrollHeight - el.clientHeight;

    if (typeof el.scrollTo === 'function') {
      el.scrollTo({
        top: ratio * maxScroll,
        behavior: 'smooth',
      });
    } else {
      el.scrollTop = ratio * maxScroll;
    }
  };

  const handleThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = resolveTarget();
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartScrollTopRef.current = el?.scrollTop || 0;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const el = resolveTarget();
      const track = trackRef.current;
      if (!el || !track) return;

      const deltaY = e.clientY - dragStartYRef.current;
      const availableTrack = track.clientHeight - thumbHeight;
      if (availableTrack <= 0) return;

      const maxScroll = el.scrollHeight - el.clientHeight;
      const scrollDelta = (deltaY / availableTrack) * maxScroll;

      el.scrollTop = Math.max(0, Math.min(maxScroll, dragStartScrollTopRef.current + scrollDelta));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, thumbHeight, viewportRef]);

  return (
    <div
      className={`reading-scrollbar-container scrollbar-${side}`}
      data-testid="reading-scrollbar-container"
      data-side={side}
    >
      <div
        ref={trackRef}
        className="reading-scrollbar-track"
        data-testid="reading-scrollbar-track"
        onClick={handleTrackClick}
        role="scrollbar"
        aria-orientation="vertical"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`reading-scrollbar-thumb ${isDragging ? 'is-dragging' : ''}`}
          data-testid="reading-scrollbar-thumb"
          style={{
            top: `${thumbTop}px`,
            height: `${thumbHeight}px`,
          }}
          onMouseDown={handleThumbMouseDown}
        />
      </div>
      <div
        className="reading-percentage-indicator"
        data-testid="reading-percentage"
      >
        {progress}%
      </div>
    </div>
  );
};
