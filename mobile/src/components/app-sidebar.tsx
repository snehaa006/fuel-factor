import { useRouter } from 'expo-router';

import { Sidebar, type SidebarItem } from '@/components/sidebar';
import { signOut } from '@/lib/account';

/**
 * The athlete's menu, in one place.
 *
 * Every athlete screen shows this list, so the navigation cannot differ
 * between two screens and a new destination is added once. Profile is first
 * because it is the item this panel was added for.
 *
 * **"Coach" is not on it.** It was, with a note saying coaches only, which is
 * the app asking a 15 year old to try a door and reading them the rule on the
 * way. The coach's half has its own account, its own menu and its own home;
 * an athlete has no reason to be shown the way to it. Sign out replaces it,
 * which is the item that was actually missing -- a device used to be whoever
 * it first became.
 */

export type AppSidebarProps = {
  open: boolean;
  onClose: () => void;
  /** The athlete's name, or the squad's. */
  title: string;
  subtitle?: string;
  /** Which route is showing, so the menu can mark it. */
  current?: string;
  /**
   * The programme has not started yet.
   *
   * The menu then lists only what exists before day one: the baseline recall,
   * the profile and the way out. Today, Learn, Team and Progress are left off
   * rather than shown greyed, for the reason "Coach" was left off this menu
   * for an athlete -- an item that walks somebody to a door and reads them
   * the rule is the app asking them to try it.
   */
  beforeStart?: boolean;
  testID?: string;
};

export function AppSidebar({
  open,
  onClose,
  title,
  subtitle,
  current,
  beforeStart = false,
  testID = 'sidebar',
}: AppSidebarProps) {
  const router = useRouter();

  const items: SidebarItem[] = [
    { key: 'profile', label: 'Profile', onPress: () => router.push('/profile') },
    ...(beforeStart
      ? [
          {
            key: 'before',
            label: 'Before you start',
            detail: 'Your three baseline recall days',
            onPress: () => router.replace('/before-you-start'),
          },
          { key: 'recall', label: 'Food recall', onPress: () => router.push('/recall') },
          { key: 'assessments', label: 'Assessments', onPress: () => router.push('/assessments') },
        ]
      : [
          { key: 'today', label: 'Today', onPress: () => router.replace('/today') },
          { key: 'recall', label: 'Food recall', onPress: () => router.push('/recall') },
          { key: 'learn', label: 'Learn', onPress: () => router.push('/learn') },
          {
            key: 'gaps',
            label: 'Fuel gaps',
            detail: 'Your last fortnight against the programme',
            onPress: () => router.push('/gaps'),
          },
          { key: 'team', label: 'Team', onPress: () => router.push('/team') },
          { key: 'progress', label: 'Progress', onPress: () => router.push('/progress') },
          { key: 'assessments', label: 'Assessments', onPress: () => router.push('/assessments') },
        ]),
    {
      key: 'sign-out',
      label: 'Sign out',
      onPress: () => {
        // The session is gone locally whether or not the server is reachable,
        // so the screen goes back to the door either way rather than leaving
        // a signed-out app on display.
        signOut().finally(() => router.replace('/sign-in'));
      },
    },
  ];

  return (
    <Sidebar
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      testID={testID}
      items={items.map((item) => ({ ...item, current: item.key === current }))}
    />
  );
}
