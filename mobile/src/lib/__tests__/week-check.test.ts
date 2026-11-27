import AsyncStorage from '@react-native-async-storage/async-storage';

import { checksFor, loadChecks, resetChecksForTests, saveCheck } from '@/lib/week-check';

beforeEach(async () => {
  resetChecksForTests();
  await AsyncStorage.clear();
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('week check results on the phone', () => {
  it('survive a reload', async () => {
    saveCheck('p-theo', 2, { right: 4, total: 5, on: '2026-11-12' });
    await flush();
    resetChecksForTests();
    expect(checksFor('p-theo')).toEqual({});
    await loadChecks('p-theo');
    expect(checksFor('p-theo')[2]).toEqual({ right: 4, total: 5, on: '2026-11-12' });
  });

  it('are kept apart for two athletes on one phone', async () => {
    saveCheck('p-theo', 1, { right: 5, total: 5, on: '2026-11-05' });
    expect(checksFor('p-jacob')).toEqual({});
  });

  it('take the latest result when a check is retaken', () => {
    saveCheck('p-theo', 1, { right: 2, total: 5, on: '2026-11-05' });
    saveCheck('p-theo', 1, { right: 5, total: 5, on: '2026-11-06' });
    expect(checksFor('p-theo')[1].right).toBe(5);
  });

  it('read a damaged entry as none done', async () => {
    await AsyncStorage.setItem('fuel-factor.week-check.p-theo', '{not json');
    await loadChecks('p-theo');
    expect(checksFor('p-theo')).toEqual({});
  });
});
