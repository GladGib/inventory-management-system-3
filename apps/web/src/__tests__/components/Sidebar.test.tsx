import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/layout/Sidebar';

// Mock next/link to render a plain anchor
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('Sidebar', () => {
  it('renders sidebar with navigation items', () => {
    render(<Sidebar collapsed={false} onCollapse={jest.fn()} />);
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Items')).toBeDefined();
    expect(screen.getByText('Inventory')).toBeDefined();
    expect(screen.getByText('Sales')).toBeDefined();
    expect(screen.getByText('Purchases')).toBeDefined();
    expect(screen.getByText('Reports')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('shows IMS Pro when not collapsed', () => {
    render(<Sidebar collapsed={false} onCollapse={jest.fn()} />);
    expect(screen.getByText('IMS Pro')).toBeDefined();
  });

  it('shows IMS when collapsed', () => {
    render(<Sidebar collapsed={true} onCollapse={jest.fn()} />);
    expect(screen.getByText('IMS')).toBeDefined();
  });

  it('renders Contacts navigation item', () => {
    render(<Sidebar collapsed={false} onCollapse={jest.fn()} />);
    expect(screen.getByText('Contacts')).toBeDefined();
  });
});
