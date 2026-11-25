import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

import { COPIED_FOR_MS, TeamCodeCard } from '@/components/team-code-card';
import { copyText } from '@/lib/clipboard';

jest.mock('@/lib/clipboard');

const mockCopy = copyText as jest.MockedFunction<typeof copyText>;

beforeEach(() => {
  jest.clearAllMocks();
  mockCopy.mockResolvedValue(true);
});

describe('the team code card', () => {
  it('shows the code large and selectable, so a long-press works without the clipboard', async () => {
    await render(<TeamCodeCard code="K7XRMP" teamName="Jakarta U16" />);
    const code = screen.getByTestId('team-code-card-code');
    expect(code).toHaveTextContent('K7XRMP');
    expect(code.props.selectable).toBe(true);
  });

  it('copies the bare code, which is what the team-code box takes', async () => {
    await render(<TeamCodeCard code="k7xrmp" teamName="Jakarta U16" />);
    fireEvent.press(screen.getByTestId('team-code-card-copy'));
    await waitFor(() => expect(mockCopy).toHaveBeenCalledWith('K7XRMP'));
  });

  it('says it copied, then goes back to offering a copy', async () => {
    await render(<TeamCodeCard code="K7XRMP" teamName="Jakarta U16" copiedForMs={60} />);
    fireEvent.press(screen.getByTestId('team-code-card-copy'));
    await waitFor(() =>
      expect(screen.getByTestId('team-code-card-copy')).toHaveTextContent('Copied ✓')
    );
    await waitFor(() =>
      expect(screen.getByTestId('team-code-card-copy')).toHaveTextContent('Copy code')
    );
  });

  it('keeps "Copied ✓" up long enough to be read', () => {
    expect(COPIED_FOR_MS).toBeGreaterThanOrEqual(2000);
  });

  it('says so when the clipboard refuses, instead of claiming a copy', async () => {
    mockCopy.mockResolvedValue(false);
    await render(<TeamCodeCard code="K7XRMP" teamName="Jakarta U16" />);
    fireEvent.press(screen.getByTestId('team-code-card-copy'));
    await waitFor(() =>
      expect(screen.getByTestId('team-code-card-copy-failed')).toHaveTextContent(/Press and hold/)
    );
    expect(screen.getByTestId('team-code-card-copy')).toHaveTextContent('Copy code');
  });

  it('shares the whole invite, with the code in it', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await render(<TeamCodeCard code="K7XRMP" teamName="Jakarta U16" />);
    fireEvent.press(screen.getByTestId('team-code-card-share'));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const message = share.mock.calls[0][0].message ?? '';
    expect(message).toMatch(/Join Jakarta U16 on Fuel Factor/);
    expect(message).toMatch(/K7XRMP/);
    share.mockRestore();
  });
});
