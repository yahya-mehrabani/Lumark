import { useState, useEffect, useCallback } from 'react';

export const MIN_ZOOM = 50;   // 50%
export const MAX_ZOOM = 250;  // 250%
export const DEFAULT_ZOOM = 100; // 100%
export const ZOOM_STEP = 10;  // 10%

/**
 * Clamps zoom value between MIN_ZOOM (50%) and MAX_ZOOM (250%).
 */
export function clampZoom(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_ZOOM;
  const rounded = Math.round(value);
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, rounded));
}

export class ZoomController {
  private zoom: number;
  private listeners: Set<(zoom: number) => void> = new Set();

  constructor(initialZoom: number = DEFAULT_ZOOM) {
    this.zoom = clampZoom(initialZoom);
  }

  public getZoom(): number {
    return this.zoom;
  }

  public getZoomFactor(): number {
    return this.zoom / 100;
  }

  public getZoomPercent(): string {
    return `${this.zoom}%`;
  }

  public setZoom(value: number): number {
    const clamped = clampZoom(value);
    if (this.zoom !== clamped) {
      this.zoom = clamped;
      this.notify();
    }
    return this.zoom;
  }

  public zoomIn(step: number = ZOOM_STEP): number {
    return this.setZoom(this.zoom + step);
  }

  public zoomOut(step: number = ZOOM_STEP): number {
    return this.setZoom(this.zoom - step);
  }

  public resetZoom(): number {
    return this.setZoom(DEFAULT_ZOOM);
  }

  public canZoomIn(): boolean {
    return this.zoom < MAX_ZOOM;
  }

  public canZoomOut(): boolean {
    return this.zoom > MIN_ZOOM;
  }

  public subscribe(listener: (zoom: number) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const current = this.zoom;
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('Error in zoomController subscriber:', err);
      }
    });
  }

  /**
   * Processes a keyboard event. Returns true if a zoom shortcut was handled.
   * Shortcuts:
   * - Ctrl/Cmd + Plus (+) or Equal (=) -> Zoom In
   * - Ctrl/Cmd + Minus (-) or Underscore (_) -> Zoom Out
   * - Ctrl/Cmd + Zero (0) -> Reset Zoom to 100%
   */
  public handleKeyDown(event: {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    preventDefault?: () => void;
  }): boolean {
    const isModifier = Boolean(event.ctrlKey || event.metaKey);
    if (!isModifier) return false;

    const key = event.key;

    if (key === '+' || key === '=' || key === 'Add') {
      event.preventDefault?.();
      this.zoomIn();
      return true;
    }

    if (key === '-' || key === '_' || key === 'Subtract') {
      event.preventDefault?.();
      this.zoomOut();
      return true;
    }

    if (key === '0' || key === 'NumPad0') {
      event.preventDefault?.();
      this.resetZoom();
      return true;
    }

    return false;
  }
}

export const zoomController = new ZoomController();

export interface UseZoomOptions {
  controller?: ZoomController;
  enableShortcuts?: boolean;
}

export function useZoom(options: UseZoomOptions = {}) {
  const { controller = zoomController, enableShortcuts = false } = options;
  const [zoom, setZoomState] = useState<number>(() => controller.getZoom());

  useEffect(() => {
    setZoomState(controller.getZoom());
    const unsubscribe = controller.subscribe((newZoom) => {
      setZoomState(newZoom);
    });
    return unsubscribe;
  }, [controller]);

  useEffect(() => {
    if (!enableShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      controller.handleKeyDown(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [controller, enableShortcuts]);

  const zoomIn = useCallback(() => controller.zoomIn(), [controller]);
  const zoomOut = useCallback(() => controller.zoomOut(), [controller]);
  const resetZoom = useCallback(() => controller.resetZoom(), [controller]);
  const setZoom = useCallback((val: number) => controller.setZoom(val), [controller]);

  return {
    zoom,
    zoomFactor: zoom / 100,
    zoomPercent: `${zoom}%`,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    canZoomIn: zoom < MAX_ZOOM,
    canZoomOut: zoom > MIN_ZOOM,
  };
}
