import { useRouter } from 'expo-router';

import { Sidebar, type SidebarItem } from '@/components/sidebar';

/**
 * The app's one menu, in one place.
 *
 * Every screen that shows a sidebar shows this list, so the navigation cannot
 * differ between two screens and a new destination is added once. Profile is
 * first because it is the item this panel was added for.
 */

export type AppSidebarProps = {
  open: boolean;
  onClose: () => void;
  /** The athlete's name, or the squad's. */
  title: string;
  subtitle?: string;
  /** Which route is showing, so the menu can mark it. */
  current?: string;
  testID?: string;
};

export function AppSidebar({
  open,
  onClose,
  title,
  subtitle,
  current,
  testID = 'sidebar',
}: AppSidebarProps) {
  const router = useRouter();

  const items: SidebarItem[] = [
    { key: 'profile', label: 'Profile', onPress: () => router.push('/profile') },
    { key: 'today', label: 'Today', onPress: () => router.replace('/') },
    { key: 'recall', label: 'Food recall', onPress: () => router.push('/recall') },
    { key: 'learn', label: 'Learn', onPress: () => router.push('/learn') },
    { key: 'team', label: 'Team', onPress: () => router.push('/team') },
    { key: 'progress', label: 'Progress', onPress: () => router.push('/progress') },
    {
      key: 'coach',
      label: 'Coach',
      // Said here rather than discovered on the next screen: an athlete who
      // taps this gets a sign-in and nothing of anybody's data.
      detail: 'Coaches only. Needs a coach account.',
      onPress: () => router.push('/coach'),
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
