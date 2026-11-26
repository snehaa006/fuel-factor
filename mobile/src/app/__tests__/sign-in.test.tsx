import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import SignIn from '@/app/sign-in';
import { signInAthlete, signUpAthlete } from '@/lib/account';

jest.mock('@/lib/account');

// A mock factory can only reach variables named mock*, so these are.
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams: { joinCode?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useLocalSearchParams: () => mockParams,
}));

const mockSignIn = signInAthlete as jest.MockedFunction<typeof signInAthlete>;
const mockSignUp = signUpAthlete as jest.MockedFunction<typeof signUpAthlete>;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockSignIn.mockResolvedValue(undefined);
  mockSignUp.mockResolvedValue({ confirmed: true });
});

/**
 * Wait for the submit to come back from "Working…".
 *
 * A state update still in flight when a test ends lands during the *next*
 * one and renders it an empty tree, which reads as a baffling "Unable to
 * find an element" on a test that passes perfectly well alone.
 */
async function settled() {
  await waitFor(() =>
    expect(screen.getByTestId('sign-in-submit').props.accessibilityState.disabled).toBe(false)
  );
}

/**
 * Fill both fields and let the button enable before pressing it.
 *
 * The two events are awaited apart rather than fired in one synchronous
 * block. Together they leave an update in flight past the end of the test,
 * and it lands in the *next* one, which then renders an empty tree.
 */
async function fill(email: string, password: string) {
  fireEvent.changeText(screen.getByTestId('sign-in-email'), email);
  await waitFor(() => expect(screen.getByTestId('sign-in-email').props.value).toBe(email));
  fireEvent.changeText(screen.getByTestId('sign-in-password'), password);
  await waitFor(() =>
    expect(screen.getByTestId('sign-in-submit').props.accessibilityState.disabled).toBe(false)
  );
}

describe('the athlete’s front door', () => {
  it('opens on sign-in, not on making an account', async () => {
    // Most opens are a returning athlete, not a new one.
    await render(<SignIn />);
    expect(screen.getByText('Welcome back')).toBeTruthy();
  });

  it('will not submit an empty form', async () => {
    await render(<SignIn />);
    expect(screen.getByTestId('sign-in-submit').props.accessibilityState.disabled).toBe(true);
  });

  it('signs in and hands the routing back to the root', async () => {
    await render(<SignIn />);
    await fill('theo@example.test', 'secret');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('theo@example.test', 'secret'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    await settled();
  });

  it('makes an account when switched over', async () => {
    await render(<SignIn />);
    fireEvent.press(screen.getByTestId('sign-in-switch'));
    await waitFor(() => expect(screen.getByText('Make your account')).toBeTruthy());

    await fill('new@example.test', 'secret');
    fireEvent.press(screen.getByTestId('sign-in-submit'));
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledWith('new@example.test', 'secret'));
    await settled();
  });

  it('says an unconfirmed account needs its email, rather than looking broken', async () => {
    mockSignUp.mockResolvedValue({ confirmed: false });
    await render(<SignIn />);
    fireEvent.press(screen.getByTestId('sign-in-switch'));
    await waitFor(() => expect(screen.getByText('Make your account')).toBeTruthy());

    await fill('new@example.test', 'secret');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() => expect(screen.getByTestId('sign-in-notice')).toHaveTextContent(/confirm/));
    expect(mockReplace).not.toHaveBeenCalled();
    await settled();
  });

  it('shows a refusal in the words the server used', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid login credentials'));
    await render(<SignIn />);
    await fill('theo@example.test', 'wrong');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('sign-in-error')).toHaveTextContent(/Invalid login credentials/)
    );
    await settled();
  });

  it('carries an invite code through to the questionnaire', async () => {
    // An invite link that found no account comes here. Sending them to the
    // root afterwards would lose the code they tapped.
    mockParams = { joinCode: 'ABC234' };
    await render(<SignIn />);
    await fill('new@example.test', 'secret');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/join/[code]',
        params: { code: 'ABC234' },
      })
    );
    await settled();
  });

  it('points a coach at their own door', async () => {
    await render(<SignIn />);
    fireEvent.press(screen.getByTestId('sign-in-as-coach'));
    expect(mockPush).toHaveBeenCalledWith('/coach/account');
  });
});

describe('choosing the language before signing in', () => {
  /**
   * Theo, 25 November: "is there like a feature that makes you be able to
   * change the language when you're logging in or signing up?" The squad is
   * Indonesian, so it is on the first screen, before anything else is read.
   */
  it('offers English and Bahasa Indonesia on the first screen', async () => {
    await render(<SignIn />);
    expect(screen.getByTestId('sign-in-language-en')).toBeTruthy();
    expect(screen.getByTestId('sign-in-language-id')).toBeTruthy();
  });

  it('turns the whole screen to Bahasa, including making an account', async () => {
    await render(<SignIn />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('sign-in-language-id'));
    });

    expect(screen.getByText('Selamat datang kembali')).toBeTruthy();
    expect(screen.getByText('KATA SANDI')).toBeTruthy();
    expect(screen.getByText('Saya pelatih →')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('sign-in-switch'));
    });
    expect(screen.getByText('Buat akunmu')).toBeTruthy();
    expect(screen.getByText('Setelah ini kamu akan memasukkan kode tim.')).toBeTruthy();
  });

  it('says a refused sign-in in Bahasa too', async () => {
    // Supabase answers in English; the common answers are translated.
    mockSignIn.mockRejectedValue(new Error('Invalid login credentials'));
    await render(<SignIn />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('sign-in-language-id'));
    });
    await fill('theo@example.test', 'wrong');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('sign-in-error')).toHaveTextContent('Email atau kata sandi salah.')
    );
    await settled();
  });

  it('shows a message it does not know exactly as it came', async () => {
    mockSignIn.mockRejectedValue(new Error('Database is on fire'));
    await render(<SignIn />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('sign-in-language-id'));
    });
    await fill('theo@example.test', 'secret');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('sign-in-error')).toHaveTextContent('Database is on fire')
    );
    await settled();
  });
});
