import type { ReactNode } from 'react';
import { useAuth } from '../auth/authContext';
import { HAPTICS, vibrate } from '../haptics';
import { useBackAction } from '../hooks/useBackAction';
import type { Tab } from '../navigation/types';
import { cx } from '../ui/cx';
import { Icon, type IconName } from '../ui/Icon';
import styles from './AppShell.module.css';

const TABS: readonly { readonly tab: Tab; readonly label: string; readonly icon: IconName }[] = [
  { tab: 'play', label: 'Jogar', icon: 'play' },
  { tab: 'ranking', label: 'Ranking', icon: 'trophy' },
  { tab: 'account', label: 'Conta', icon: 'user' },
];

interface AppShellProps {
  readonly tab: Tab;
  readonly onTab: (tab: Tab) => void;
  readonly children: ReactNode;
}

/**
 * Frame of the main screens: Jogar, Ranking and Conta, switched from a bar at the bottom of a phone (in reach of the
 * thumb) or at the top of a wide screen. Without accounts there is only the game, so there is no bar.
 */
export function AppShell({ tab, onTab, children }: AppShellProps) {
  const { status } = useAuth();
  const hasTabs = status === 'anonymous' || status === 'signedIn';
  // Back from Ranking or Conta returns to the game list; from there it leaves the app.
  useBackAction(() => {
    onTab('play');
  }, tab !== 'play');

  return (
    <div className={cx(styles.shell, hasTabs && styles.withTabs)}>
      {hasTabs && (
        <nav className={styles.nav} aria-label="Navegação">
          {TABS.map(({ tab: id, label, icon }) => (
            <button
              key={id}
              type="button"
              className={cx(styles.tab, id === tab && styles.current)}
              aria-current={id === tab ? 'page' : undefined}
              onClick={() => {
                if (id === tab) return;
                vibrate(HAPTICS.tap);
                onTab(id);
              }}
            >
              <Icon name={icon} size={24} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
      <div className={styles.page}>{children}</div>
    </div>
  );
}
