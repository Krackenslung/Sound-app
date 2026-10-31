import { screen } from '@testing-library/react';
import { mockApi, premiumUser, renderApp } from '@/test/renderApp';

describe('AppShell', () => {
  it('renders sidebar, main and player bar for a logged-in user', async () => {
    mockApi({ me: premiumUser });
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      /^Good (morning|afternoon|evening), Jesus$/,
    );
    expect(screen.getByRole('complementary', { name: 'Sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: 'Player' })).toBeInTheDocument();
  });

  it('marks the current route as active in the nav', async () => {
    mockApi({ me: premiumUser });
    renderApp('/library');
    expect(await screen.findByRole('link', { name: 'Library' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });
});
