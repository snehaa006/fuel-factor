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

  it('says when it has not been configured', () => {
    unconfigure();
    expect(load().isConfigured()).toBe(false);
  });

  it('says when it has been', () => {
    configure();
    expect(load().isConfigured()).toBe(true);
  });

  it('fails loudly on first use when it is not configured', () => {
    // Still a hard failure, just at the point where it means something.
    unconfigure();
    const { supabase } = load();
    expect(() => supabase.from('participants')).toThrow(/Missing EXPO_PUBLIC_SUPABASE_URL/);
  });

  it('builds a usable client when it is', () => {
    configure();
    const { supabase } = load();
    // Bound to the real client: a Supabase method called with the proxy as
    // its `this` does not work.
    expect(typeof supabase.from).toBe('function');
    expect(supabase.from('participants')).toBeTruthy();
    expect(supabase.auth).toBeTruthy();
  });
});
