import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  LanguageSwitch,
  PreferenceSwitches,
  ThemeSwitch,
} from '@/components/preference-switches';
import { Sidebar } from '@/components/sidebar';
import { useStrings } from '@/i18n';
import { currentLanguage, setLanguage, themePreference } from '@/lib/preferences';
import { useTheme } from '@/theme';

/** Something on screen that reads both, the way every screen does. */
function Probe() {
  const theme = useTheme();
  const t = useStrings();
  return (
    <>
      <Text testID="probe-theme">{theme.name}</Text>
      <Text testID="probe-surface">{theme.colors.surface}</Text>
      <Text testID="probe-copy">{t.today.logMeal}</Text>
    </>
  );
}

describe('the language switch', () => {
  it('starts on the language the app is speaking', async () => {
    await render(<LanguageSwitch />);
    expect(screen.getByTestId('language-switch-en').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('language-switch-id').props.accessibilityState.selected).toBe(false);
  });

  it('turns every screen that reads the dictionary to Bahasa at once', async () => {
    await render(
      <>
        <LanguageSwitch />
        <Probe />
      </>
    );
    expect(screen.getByTestId('probe-copy')).toHaveTextContent('Log a meal');

    await act(async () => {
      fireEvent.press(screen.getByTestId('language-switch-id'));
    });

    expect(currentLanguage()).toBe('id');
    expect(screen.getByTestId('probe-copy')).toHaveTextContent('Catat makanan');
    expect(screen.getByTestId('language-switch-id').props.accessibilityState.selected).toBe(true);
  });

  it('names each language in its own words, whichever one is showing', async () => {
    // Somebody who cannot read the current language can still find theirs.
    await act(async () => setLanguage('id'));
    await render(<LanguageSwitch />);
    expect(screen.getByLabelText('English')).toBeTruthy();
    expect(screen.getByLabelText('Bahasa Indonesia')).toBeTruthy();
  });

  it('is two letters on the sign-in screens', async () => {
    await render(<LanguageSwitch compact />);
    expect(screen.getByText('EN')).toBeTruthy();
    expect(screen.getByText('ID')).toBeTruthy();
  });
});

describe('the theme switch', () => {
  it('starts on System', async () => {
    await render(<ThemeSwitch />);
    expect(screen.getByTestId('theme-switch-system').props.accessibilityState.selected).toBe(true);
  });

  it('forces dark, and back to light, whatever the phone says', async () => {
    await render(
      <>
        <ThemeSwitch />
        <Probe />
      </>
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-switch-dark'));
    });
    expect(themePreference()).toBe('dark');
    expect(screen.getByTestId('probe-theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('probe-surface')).toHaveTextContent('#0a2639');

    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-switch-light'));
    });
    expect(screen.getByTestId('probe-theme')).toHaveTextContent('light');
    expect(screen.getByTestId('probe-surface')).toHaveTextContent('#f6eed3');
  });

  it('speaks the language that is chosen', async () => {
    await act(async () => setLanguage('id'));
    await render(<ThemeSwitch />);
    expect(screen.getByText('GELAP')).toBeTruthy();
    expect(screen.getByLabelText('Tema gelap')).toBeTruthy();
  });
});

describe('where they live', () => {
  it('sits at the foot of the menu, which every screen has', async () => {
    await render(
      <Sidebar open onClose={() => {}} title="Theo" items={[]} testID="sidebar" />
    );
    expect(screen.getByTestId('sidebar-preferences')).toBeTruthy();
    expect(screen.getByTestId('sidebar-preferences-language-id')).toBeTruthy();
    expect(screen.getByTestId('sidebar-preferences-theme-dark')).toBeTruthy();
  });

  it('labels both, and says what System means', async () => {
    await render(<PreferenceSwitches />);
    expect(screen.getByText('LANGUAGE')).toBeTruthy();
    expect(screen.getByText('THEME')).toBeTruthy();
    expect(screen.getByText(/follows your phone/)).toBeTruthy();
  });
});
