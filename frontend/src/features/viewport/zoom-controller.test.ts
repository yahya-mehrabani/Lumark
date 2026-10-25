import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  ZoomController,
  clampZoom,
  useZoom,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
} from './zoomController';

describe('ZoomController & Keyboard Shortcuts (US-023.3)', () => {
  let controller: ZoomController;

  beforeEach(() => {
    controller = new ZoomController();
  });

  describe('Clamping & Step Calculations', () => {
    it('initializes to 100% by default', () => {
      expect(controller.getZoom()).toBe(100);
      expect(controller.getZoomFactor()).toBe(1.0);
      expect(controller.getZoomPercent()).toBe('100%');
    });

    it('clamps values below MIN_ZOOM to 50%', () => {
      expect(clampZoom(20)).toBe(MIN_ZOOM);
      expect(clampZoom(49)).toBe(MIN_ZOOM);
      expect(controller.setZoom(10)).toBe(MIN_ZOOM);
      expect(controller.getZoom()).toBe(MIN_ZOOM);
      expect(controller.canZoomOut()).toBe(false);
      expect(controller.canZoomIn()).toBe(true);
    });

    it('clamps values above MAX_ZOOM to 250%', () => {
      expect(clampZoom(300)).toBe(MAX_ZOOM);
      expect(clampZoom(251)).toBe(MAX_ZOOM);
      expect(controller.setZoom(500)).toBe(MAX_ZOOM);
      expect(controller.getZoom()).toBe(MAX_ZOOM);
      expect(controller.canZoomIn()).toBe(false);
      expect(controller.canZoomOut()).toBe(true);
    });

    it('increments zoom by 10% per step on zoomIn()', () => {
      expect(controller.zoomIn()).toBe(110);
      expect(controller.zoomIn()).toBe(120);
      expect(controller.zoomIn(20)).toBe(140);
    });

    it('decrements zoom by 10% per step on zoomOut()', () => {
      expect(controller.zoomOut()).toBe(90);
      expect(controller.zoomOut()).toBe(80);
      expect(controller.zoomOut(20)).toBe(60);
    });

    it('enforces upper bound when stepping past 250%', () => {
      controller.setZoom(245);
      expect(controller.zoomIn()).toBe(MAX_ZOOM);
      expect(controller.zoomIn()).toBe(MAX_ZOOM);
    });

    it('enforces lower bound when stepping below 50%', () => {
      controller.setZoom(55);
      expect(controller.zoomOut()).toBe(MIN_ZOOM);
      expect(controller.zoomOut()).toBe(MIN_ZOOM);
    });

    it('resets to 100% on resetZoom()', () => {
      controller.setZoom(180);
      expect(controller.resetZoom()).toBe(DEFAULT_ZOOM);
      expect(controller.getZoom()).toBe(DEFAULT_ZOOM);
      expect(controller.getZoomFactor()).toBe(1.0);
    });
  });

  describe('Keyboard Shortcut Handlers', () => {
    it('handles Ctrl/Cmd + Plus (=) for zoom in', () => {
      const preventDefault = vi.fn();
      const handledEqual = controller.handleKeyDown({
        key: '=',
        ctrlKey: true,
        preventDefault,
      });

      expect(handledEqual).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
      expect(controller.getZoom()).toBe(110);

      const handledPlus = controller.handleKeyDown({
        key: '+',
        metaKey: true,
        preventDefault,
      });
      expect(handledPlus).toBe(true);
      expect(controller.getZoom()).toBe(120);
    });

    it('handles Ctrl/Cmd + Minus (-) for zoom out', () => {
      const preventDefault = vi.fn();
      const handled = controller.handleKeyDown({
        key: '-',
        ctrlKey: true,
        preventDefault,
      });

      expect(handled).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
      expect(controller.getZoom()).toBe(90);
    });

    it('handles Ctrl/Cmd + 0 for zoom reset', () => {
      controller.setZoom(160);
      const preventDefault = vi.fn();
      const handled = controller.handleKeyDown({
        key: '0',
        metaKey: true,
        preventDefault,
      });

      expect(handled).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
      expect(controller.getZoom()).toBe(100);
    });

    it('ignores non-modifier keys or unrelated shortcuts', () => {
      const preventDefault = vi.fn();
      const handledRegularKey = controller.handleKeyDown({
        key: '=',
        ctrlKey: false,
        metaKey: false,
        preventDefault,
      });
      expect(handledRegularKey).toBe(false);
      expect(preventDefault).not.toHaveBeenCalled();
      expect(controller.getZoom()).toBe(100);

      const handledOtherShortcut = controller.handleKeyDown({
        key: 'c',
        ctrlKey: true,
        preventDefault,
      });
      expect(handledOtherShortcut).toBe(false);
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Subscriptions and useZoom Hook', () => {
    it('notifies subscribers on zoom changes', () => {
      const listener = vi.fn();
      const unsubscribe = controller.subscribe(listener);

      controller.zoomIn();
      expect(listener).toHaveBeenCalledWith(110);

      controller.resetZoom();
      expect(listener).toHaveBeenCalledWith(100);

      unsubscribe();
      controller.zoomOut();
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('useZoom hook tracks zoom state and binds shortcuts', () => {
      const { result } = renderHook(() =>
        useZoom({ controller, enableShortcuts: true })
      );

      expect(result.current.zoom).toBe(100);
      expect(result.current.zoomFactor).toBe(1.0);
      expect(result.current.zoomPercent).toBe('100%');

      act(() => {
        result.current.zoomIn();
      });
      expect(result.current.zoom).toBe(110);

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: '=', ctrlKey: true, bubbles: true })
        );
      });
      expect(result.current.zoom).toBe(120);

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: '0', ctrlKey: true, bubbles: true })
        );
      });
      expect(result.current.zoom).toBe(100);
    });
  });
});
