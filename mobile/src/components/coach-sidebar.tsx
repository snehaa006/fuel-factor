import { useRouter } from 'expo-router';

import { Sidebar, type SidebarItem } from '@/components/sidebar';
import { signOut } from '@/lib/account';

/**
 * The coach's menu.
 *
 * Its own list, not the athlete's with two items hidden. The two halves of
 * this app go to different places and show different data, and a shared menu
 * filtered by role is the arrangement that let a coach end up on an athlete's
 * Today screen in the first place. Nothing here routes into the athlete app.
 */

export type CoachSidebarProps = {
  open: boolean;
  onClose: () => void;
  /** The squad's name. */
  title: string;
  subtitle?: string;
  current?: string;
  testID?: string;
};

export function CoachSidebar({
  open,
  onClose,
  title,
  subtitle,
  current,
  testID = 'coach-sidebar',
}: CoachSidebarProps) {
  const router = useRouter();

  const items: SidebarItem[] = [
    { key: 'dashboard', label: 'Squad', onPress: () => router.replace('/coach') },
    {
      key: 'team',
      label: 'Team and codes',
      detail: 'The join code to hand out, and day one of the four weeks.',
      onPress: () => router.push('/coach/team'),
    },
    {
      key: 'assessments',
      label: 'Assessments',
      detail: 'Week 0 and Week 4 measures.',
      onPress: () => router.push('/coach/assessments'),
    },
    {
      key: 'sign-out',
      label: 'Sign out',
      onPress: () => {
        // The session is gone locally whether or not the server is reachable,
        // so the screen goes back to the door either way rather than leaving
        // a signed-out dashboard on display.
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
