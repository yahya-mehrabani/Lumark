import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Icon, IconName } from './Icon';

describe('Icon Component', () => {
  const iconNames: IconName[] = [
    'sun',
    'moon',
    'monitor',
    'search',
    'printer',
    'outline',
    'focus',
    'folder-open',
    'clock',
    'settings',
    'plus',
    'minus',
    'chevron-down',
    'chevron-up',
    'chevron-left',
    'chevron-right',
    'close',
    'copy',
    'check',
    'alert',
    'file',
    'reset',
  ];

  it('renders all defined icon types without crashing', () => {
    for (const name of iconNames) {
      const { container } = render(<Icon name={name} size={20} data-testid={`icon-${name}`} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass(`icon-${name}`);
      expect(svg).toHaveAttribute('width', '20');
      expect(svg).toHaveAttribute('height', '20');
      expect(svg?.children.length).toBeGreaterThan(0);
    }
  });

  it('renders sun icon with 8 rays and 1 circle', () => {
    const { container } = render(<Icon name="sun" size={24} />);
    const lines = container.querySelectorAll('line');
    const circle = container.querySelectorAll('circle');
    expect(lines.length).toBe(8);
    expect(circle.length).toBe(1);
  });
});
