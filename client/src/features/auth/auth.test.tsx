import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockApi, premiumUser, renderApp } from '@/test/renderApp';

describe('auth flow', () => {
  it('redirects to /login when not logged in', async () => {
    mockApi({ me: 401 });
    const { router } = renderApp('/library');
    expect(await screen.findByRole('link', { name: 'Continue with Spotify' })).toHaveAttribute(
      'href',
      '/api/auth/login',
    );
    expect(router.state.location.pathname).toBe('/login');
  });

  it('sends logged-in users away from /login', async () => {
    mockApi({ me: premiumUser });
    const { router } = renderApp('/login');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('shows the not-allowlisted message when Spotify returns 403', async () => {
    mockApi({ me: 403 });
    const { router } = renderApp('/');
    expect(await screen.findByRole('alert')).toHaveTextContent(/invite list/);
    expect(router.state.location.search).toBe('?error=not_allowlisted');
  });

  it.each([
    ['access_denied', /cancelled/],
    ['state_mismatch', /expired or was interrupted/],
    ['something_else', /Something went wrong/],
  ])('shows a message for ?error=%s', async (code, text) => {
    mockApi({ me: 401 });
    renderApp(`/login?error=${code}`);
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
  });

  it('shows real name, avatar initials and plan in the sidebar', async () => {
    mockApi({ me: premiumUser });
    renderApp('/');
    const sidebar = await screen.findByRole('complementary', { name: 'Sidebar' });
    expect(within(sidebar).getByText('Jesus G.')).toBeInTheDocument();
    expect(within(sidebar).getByText('JG')).toBeInTheDocument();
    expect(within(sidebar).getByText('Premium')).toBeInTheDocument();
  });

  it('uses the Spotify avatar image when available', async () => {
    mockApi({ me: { ...premiumUser, avatarUrl: 'https://i.scdn.co/image/a' } });
    renderApp('/');
    const sidebar = await screen.findByRole('complementary', { name: 'Sidebar' });
    expect(sidebar.querySelector('img')).toHaveAttribute('src', 'https://i.scdn.co/image/a');
  });

  it('shows the Premium banner only for non-Premium users', async () => {
    mockApi({ me: { ...premiumUser, product: 'free' } });
    renderApp('/');
    expect(await screen.findByText('Playback requires Spotify Premium.')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('hides the Premium banner for Premium users', async () => {
    mockApi({ me: premiumUser });
    renderApp('/');
    await screen.findByText('Jesus G.');
    expect(screen.queryByText('Playback requires Spotify Premium.')).not.toBeInTheDocument();
  });

  it('logs out from the account menu', async () => {
    const fetchMock = mockApi({ me: premiumUser });
    const { router } = renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Account menu' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Log out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(await screen.findByRole('link', { name: 'Continue with Spotify' })).toBeInTheDocument();
  });
});
