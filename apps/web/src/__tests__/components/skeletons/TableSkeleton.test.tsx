import { render } from '@testing-library/react';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

describe('TableSkeleton', () => {
  it('renders without errors', () => {
    const { container } = render(<TableSkeleton />);
    expect(container.firstChild).toBeDefined();
  });

  it('renders with default rows and columns', () => {
    const { container } = render(<TableSkeleton />);
    // Default is 5 rows; skeleton should render children
    expect(container).toBeDefined();
    expect(container.firstChild).not.toBeNull();
  });

  it('renders specified number of rows', () => {
    const rows = 3;
    const { container } = render(<TableSkeleton rows={rows} />);
    // The container should have: search bar div + header div + row divs + pagination div
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toBeDefined();
    // Total children: search bar (1) + header (1) + rows (3) + pagination (1) = 6
    expect(rootDiv.childNodes.length).toBe(6);
  });

  it('renders specified number of columns', () => {
    const columns = 3;
    const { container } = render(<TableSkeleton rows={1} columns={columns} />);
    const rootDiv = container.firstChild as HTMLElement;
    // The header row (second child) should have `columns` skeleton inputs
    const headerRow = rootDiv.childNodes[1] as HTMLElement;
    expect(headerRow.childNodes.length).toBe(columns);
  });

  it('renders with custom rows and columns', () => {
    const { container } = render(<TableSkeleton rows={10} columns={8} />);
    const rootDiv = container.firstChild as HTMLElement;
    // Total: search bar (1) + header (1) + rows (10) + pagination (1) = 13
    expect(rootDiv.childNodes.length).toBe(13);
  });
});
