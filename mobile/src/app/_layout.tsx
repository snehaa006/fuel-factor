import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { TimeMachine } from '@/components/time-machine';
import { restoreSimulatedDate, useSimulatedDate } from '@/lib/clock';
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
  useEffect(() => {
    if (clockReady) return;
    restoreSimulatedDate().finally(() => setClockReady(true));
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
