/* eslint-env jest */

// Expo's bundler injects EXPO_PUBLIC_* from .env; jest does not. The Supabase
// client throws at import time without them, which is what we want in the app.
process.env.EXPO_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= 'sb_publishable_test_key';
// Haptics talk to hardware that does not exist in jsdom.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// AsyncStorage is a native module; its maintainers ship this mock for jest.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// React 19 only treats updates as act-wrapped when this is set. Without it,
// every state change that lands after a test body finishes logs a warning that
// drowns out the ones worth reading.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
