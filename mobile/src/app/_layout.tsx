import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { TimeMachine } from '@/components/time-machine';
import { restoreSimulatedDate, useSimulatedDate } from '@/lib/clock';
import { restorePreferences } from '@/lib/preferences';
import { useTheme } from '@/theme';
import { fontAssets } from '@/theme/fonts';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or unsupported on this platform.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [clockReady, setClockReady] = useState(false);
  const simulated = useSimulatedDate();
  const theme = useTheme();

  // The remembered time-machine date is read before the first screen draws,
  // so a reload lands on the day being tested rather than on today first.
  // The theme and language are read in the same wait, so the app never opens
  // in the phone's colours and then flips to the ones its owner chose.
  useEffect(() => {
    if (clockReady) return;
    Promise.all([restoreSimulatedDate(), restorePreferences()]).finally(() => setClockReady(true));
  }, [clockReady]);

  const ready = (fontsLoaded || fontError) && clockReady;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  // Hold the splash rather than flashing a system-font frame first.
  if (!ready) return null;

  return (
    <>
      {/* The clock and battery follow the app's theme, not the phone's: a
          phone in dark mode showing the app in light would otherwise draw
          white status icons on cream. */}
      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
      {/* Keyed on the date, so moving the time machine remounts every screen
          and each one loads the new day from scratch, exactly as opening the
          app on that day would. `/` routes from there. */}
      <Stack
        key={simulated ?? 'real'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.surface },
        }}
      />
      <TimeMachine />
    </>
  );
}
