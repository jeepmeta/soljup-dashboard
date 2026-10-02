import { useRef, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import type { WorkspaceTab } from './SettingsWorkspace';
import styles from './WorkspaceTabs.module.css';

interface Props {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}

const WORKSPACE_TABS: { id: WorkspaceTab; label: string; shortLabel: string }[] = [
  { id: 'home', label: 'Home', shortLabel: 'Home' },
  { id: 'ai', label: 'AI Assistant', shortLabel: 'AI' },
  { id: 'doginal', label: 'Doginal Dogs', shortLabel: 'Dogs' },
  { id: 'backtesting', label: 'Solana Bots', shortLabel: 'Bots' },
  { id: 'keys', label: 'API Keys', shortLabel: 'Keys' },
  { id: 'connections', label: 'Connections', shortLabel: 'Feeds' },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings' },
];

export function WorkspaceTabs({ activeTab, onChange }: Props) {
  const tablistRef = useRef<HTMLElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = WORKSPACE_TABS.findIndex((tab) => tab.id === activeTab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % WORKSPACE_TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + WORKSPACE_TABS.length) % WORKSPACE_TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = WORKSPACE_TABS.length - 1;
    else return;

    event.preventDefault();
    const nextTab = WORKSPACE_TABS[nextIndex];
    onChange(nextTab.id);
    tablistRef.current?.querySelector<HTMLButtonElement>(`#tab-${nextTab.id}`)?.focus();
  };

  return (
    <nav ref={tablistRef} className={styles.tabs} role="tablist" aria-label="Workspace sections">
      {WORKSPACE_TABS.map((tab) => (
        <button
          key={tab.id}
          id={`tab-${tab.id}`}
          type="button"
          className={styles.tab}
          role="tab"
          aria-label={tab.label}
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={handleKeyDown}
        >
          {activeTab === tab.id && (
            <motion.span
              className={styles.indicator}
              layoutId="workspace-tab-indicator"
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              aria-hidden="true"
            />
          )}
          <span className={styles.full} aria-hidden="true">{tab.label}</span>
          <span className={styles.short} aria-hidden="true">{tab.shortLabel}</span>
        </button>
      ))}
    </nav>
  );
}