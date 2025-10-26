import { vi } from 'vitest';

// Mock React Router hooks to prevent undefined errors
export const mockUseNavigate = vi.fn();
export const mockUseLocation = vi.fn(() => ({
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default'
}));
export const mockUseParams = vi.fn(() => ({}));
export const mockUseSearchParams = vi.fn(() => [new URLSearchParams(), vi.fn()]);
export const mockUseRoutes = vi.fn(() => null);

// Mock the entire react-router-dom module
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockUseNavigate,
    useLocation: mockUseLocation,
    useParams: mockUseParams,
    useSearchParams: mockUseSearchParams,
    useRoutes: mockUseRoutes,
  };
});
