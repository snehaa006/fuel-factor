import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LeaderboardRow } from '@/components/leaderboard-row';
import { myRow } from '@/lib/team';
import { useTeam } from '@/lib/use-team';
import { useTheme } from '@/theme';

/**
 * The team leaderboard.
 *
 * Ranked on logging consistency and nothing else. There is no weight here, no
 * waist, no calf, no diet quality -- the first three because ranking minors on
 * their bodies is a safeguarding failure, the fourth because the programme has
 * not defined the scale and the app will not invent one to sort children by.
 *
 * What it does show is who logged today, which is the half of the mechanic
 * Theo actually asked for: a squad that can see each other's dots nudges each
 * other without the app sending a notification.
 */
export default function Team() {
  const router = useRouter();
  const { colors, radius, spacing, typography } = useTheme();
  const state = useTeam();

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.pisang} />
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, styles.centre, { backgroundColor: colors.surface }]}>
        <View style={{ padding: spacing['space-6'], gap: spacing['space-2'] }}>
          <Text style={[typography['heading-l'], { color: colors.ink, textAlign: 'center' }]}>
            Could not load the team
          </Text>
          <Text style={[typography['body-m'], { color: colors['ink-muted'], textAlign: 'center' }]}>
            {state.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { board } = state;
  const me = myRow(board.rows);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing['space-4'] }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to today"
          testID="team-back"
        >
          <Text style={[typography.label, { color: colors['ink-muted'] }]}>← TODAY</Text>
        </Pressable>

        <Text
          style={[typography['display-l'], { color: colors.ink, marginTop: spacing['space-2'] }]}
        >
          {/* No team name invented when the row has not loaded one. */}
          {board.teamName ?? 'Your team'}
        </Text>
        <Text testID="team-window" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
          Ranked on days logged over the last {board.windowDays} days.
        </Text>

        {/* The MVP card. Absent, rather than awarded to whoever sorts first,
            on a week in which nobody has logged anything. */}
        {board.mvp.length > 0 && (
          <View
            testID="mvp"
            style={{
              backgroundColor: colors['pisang-tint'],
              borderRadius: radius['radius-lg'],
              padding: spacing['space-4'],
              marginTop: spacing['space-6'],
              gap: 4,
            }}
          >
            <Text style={[typography.label, { color: colors['ink-muted'] }]}>
              {board.mvp.length > 1 ? 'MVP THIS WEEK — SHARED' : 'MVP THIS WEEK'}
            </Text>
            <Text testID="mvp-name" style={[typography['heading-l'], { color: colors['pisang-deep'] }]}>
              {/* A shared week is shared. Breaking the tie would need a second
                  ranking, and the only figures to hide one in are the ones
                  this screen exists to keep out. */}
              {board.mvp.join(' & ')}
            </Text>
          </View>
        )}

        <View style={{ marginTop: spacing['space-8'], gap: spacing['space-3'] }}>
          {board.rows.length === 0 ? (
            <Text testID="team-empty" style={[typography['body-m'], { color: colors['ink-muted'] }]}>
              No squad yet. Claim an athlete with your team code and the rest of the team
              appears here.
            </Text>
          ) : (
            board.rows.map((row) => (
              <LeaderboardRow
                key={row.participantCode}
                row={row}
                windowDays={board.windowDays}
                testID={`row-${row.participantCode}`}
              />
            ))
          )}
        </View>

        {/* Where the athlete stands, said once in words, because a position in
            a list is easy to miss and this is the line that makes them log. */}
        {me !== null && (
          <Text
            testID="my-standing"
            style={[
              typography['body-m'],
              { color: colors['ink-muted'], marginTop: spacing['space-6'], textAlign: 'center' },
            ]}
          >
            {me.daysLogged === 0
              ? 'Log a meal today and you are on the board.'
              : `You are ${ordinal(me.position)} on ${me.daysLogged} of ${board.windowDays} days.`}
          </Text>
        )}

        {/* Said plainly, because an athlete comparing themselves to a teammate
            deserves to know what is and is not being compared. */}
        <Text
          testID="team-basis"
          style={[
            typography['body-s'],
            {
              color: colors['ink-faint'],
              marginTop: spacing['space-8'],
              textAlign: 'center',
            },
          ]}
        >
          This board counts logging only. Nobody is ranked on their weight or their size.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** 1st, 2nd, 3rd. Shared positions read the same, which is correct. */
export function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
});
