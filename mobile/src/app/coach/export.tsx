import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PushButton } from '@/components/push-button';
import { useStrings } from '@/i18n';
import { localised, messageOf } from '@/lib/errors';
import { SHEETS, deliverCsv, fetchSheetCsv, fileName, type SheetKey } from '@/lib/export';
import { todayIso } from '@/lib/today';
import { useAccount } from '@/lib/use-account';
import { useTheme } from '@/theme';

/**
 * The coach's research export: one button per tracker tab, each a CSV of the
 * squad's rows in that tab's columns. See `lib/export.ts`.
 */
export default function CoachExport() {
  const { colors } = useTheme();
  const account = useAccount();

  if (account.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }
  if (account.status === 'ready' && account.account.role === 'signed-out') {
    return <Redirect href="/coach/account" />;
  }
  // An athlete has no squad to export.
  if (account.status === 'ready' && account.account.role === 'athlete') {
    return <Redirect href="/today" />;
  }
  return <ExportSheets />;
}

type Status = { state: 'working' } | { state: 'done'; rows: number } | { state: 'error'; message: string };

export function ExportSheets() {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const t = useStrings();
  const e = t.export;
  const [status, setStatus] = useState<Partial<Record<SheetKey, Status>>>({});

  async function download(sheet: SheetKey) {
    setStatus((s) => ({ ...s, [sheet]: { state: 'working' } }));
    try {
      const { csv, rows } = await fetchSheetCsv(sheet);
      await deliverCsv(fileName(sheet, todayIso()), csv);
      setStatus((s) => ({ ...s, [sheet]: { state: 'done', rows } }));
    } catch (error) {
      setStatus((s) => ({ ...s, [sheet]: { state: 'error', message: localised(messageOf(error), t) } }));
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" testID="export-back">
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>{t.common.back}</Text>
        </Pressable>
        <Text style={[typography['display-m'], { color: colors.ink, marginTop: spacing['space-2'] }]}>
          {e.title}
        </Text>
        <Text style={[typography['body-m'], { color: colors['ink-muted'], marginTop: spacing['space-2'] }]}>
          {e.lead}
        </Text>

        <View style={{ marginTop: spacing['space-6'], gap: spacing['space-3'] }}>
          {SHEETS.map(({ key }) => {
            const s = status[key];
            return (
              <View
                key={key}
                testID={`export-${key}`}
                style={{
                  backgroundColor: colors['surface-raised'],
                  borderRadius: radius['radius-lg'],
                  padding: spacing['space-4'],
                  gap: spacing['space-2'],
                }}
              >
                <Text style={[typography['heading-m'], { color: colors.ink }]}>{e.sheets[key] ?? key}</Text>
                <Text style={[typography['body-s'], { color: colors['ink-muted'] }]}>{e.details[key]}</Text>
                <PushButton
                  label={s?.state === 'working' ? e.working : e.download}
                  disabled={s?.state === 'working'}
                  testID={`export-${key}-download`}
                  onPress={() => {
                    download(key).catch(() => {});
                  }}
                />
                {s?.state === 'done' && (
                  <Text
                    testID={`export-${key}-done`}
                    style={[typography['body-s'], { color: colors['daun-deep'] }]}
                  >
                    {Platform.OS === 'web' ? e.done(s.rows) : e.shared(s.rows)}
                  </Text>
                )}
                {s?.state === 'error' && (
                  <Text
                    testID={`export-${key}-error`}
                    style={[typography['body-s'], { color: colors['cabai-deep'] }]}
                  >
                    {s.message}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
});
