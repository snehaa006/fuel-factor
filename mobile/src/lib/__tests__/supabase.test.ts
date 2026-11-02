/**
 * The client is built on first use, not on import.
 *
 * This file does NOT mock `@/lib/supabase`, unlike every other test here,
 * because the thing under test is what the module does when it loads.
 */

const URL_KEY = 'EXPO_PUBLIC_SUPABASE_URL';
const PUBLISHABLE_KEY = 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY';

type SupabaseModule = typeof import('@/lib/supabase');

/** Load the module fresh, with whatever environment is set right now. */
function load(): SupabaseModule {
  let mod!: SupabaseModule;
  jest.isolateModules(() => {
    // require, not import(): dynamic import needs --experimental-vm-modules,
    // which this project's jest does not run with.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('@/lib/supabase') as SupabaseModule;
  });
  return mod;
}

const unconfigure = () => {
  delete process.env[URL_KEY];
  delete process.env[PUBLISHABLE_KEY];
};

const configure = () => {
  process.env[URL_KEY] = 'http://localhost:54321';
  process.env[PUBLISHABLE_KEY] = 'sb_publishable_test_key';
};

const original = {
  url: process.env[URL_KEY],
  key: process.env[PUBLISHABLE_KEY],
};

afterEach(() => {
  process.env[URL_KEY] = original.url;
  process.env[PUBLISHABLE_KEY] = original.key;
  jest.resetModules();
});

describe('the Supabase client', () => {
  it('imports without configuration', () => {
    // The regression this guards: it used to throw here, and because nearly
    // every module imports it transitively, a build without the environment
    // died on launch before a screen rendered -- including a demo build,
    // which never calls Supabase at all. The first APK shipped that way.
    unconfigure();
    expect(() => load()).not.toThrow();
    expect(load()).toHaveProperty('supabase');
  });

  it('is configured with nothing in the environment at all', () => {
    // The regression this guards is the one the phone showed: a bundle
    // published without `EXPO_PUBLIC_*` exported opened on "Missing
    // EXPO_PUBLIC_SUPABASE_URL" at the team-code gate. `eas.json` only
    // covers `eas build`, `.env` only covers one laptop, and `eas update`
    // sees neither. The committed default is what makes that unreachable.
    unconfigure();
    expect(load().isConfigured()).toBe(true);
  });

  it('builds a usable client from the default alone', () => {
    unconfigure();
    const { supabase } = load();
    // Bound to the real client: a Supabase method called with the proxy as
    // its `this` does not work.
    expect(typeof supabase.from).toBe('function');
    expect(supabase.from('participants')).toBeTruthy();
    expect(supabase.auth).toBeTruthy();
  });

  it('lets the environment win, so a dev build can point somewhere else', () => {
    configure();
    const { supabase } = load();
    expect(load().isConfigured()).toBe(true);
    expect(supabase.from('participants')).toBeTruthy();
  });

  it('still refuses to invent a client out of nothing', () => {
    // The throw is unreachable from the environment now, and stays as the
    // guard it was: an empty default must fail loudly rather than build a
    // client pointed at nowhere.
    jest.resetModules();
    jest.doMock('@/lib/supabase-config', () => ({
      DEFAULT_SUPABASE_URL: '',
      DEFAULT_SUPABASE_PUBLISHABLE_KEY: '',
    }));
    unconfigure();
    const { supabase } = load();
    expect(() => supabase.from('participants')).toThrow(/Missing EXPO_PUBLIC_SUPABASE_URL/);
    jest.dontMock('@/lib/supabase-config');
  });
});
