export const en = {
  panel: {
    count: '{n} calls',
    toolbar: {
      search: 'Search',
      clear: 'Clear',
      settings: 'Settings',
      monitoring: 'Monitoring',
      filter: { kind: 'Kind', origin: 'Origin', chain: 'Chain' },
    },
    list: { method: 'Method', origin: 'Origin', status: 'Status', duration: 'Time', ts: 'When' },
    detail: {
      tabs: { params: 'Parameters', result: 'Result', timing: 'Timing', raw: 'Raw' },
      replay: 'Replay', mock: 'Mock', block: 'Block',
      disabledHint: 'P1 feature — coming soon',
      empty: 'Select a call to inspect',
    },
    empty: {
      waiting: { title: 'Waiting for calls', hint: 'Interact with the DApp to capture RPC activity' },
      noDapp: { title: 'No DApp detected', hint: 'This page does not expose a Web3 provider' },
    },
  },
  popup: {
    title: 'DApp Inspector',
    monitoring: 'Monitoring',
    openFull: 'View full call history',
    variants: {
      active: { heading: 'Connected', hint: 'Inspecting activity' },
      off: { heading: 'Monitoring off', hint: 'Turn on to capture calls' },
      noDapp: { heading: 'No DApp here', hint: 'Visit a Web3 DApp to start' },
    },
    recent: 'Recent activity',
  },
  options: {
    nav: { general: 'General', capture: 'Capture', mock: 'Mock', advanced: 'Advanced', about: 'About' },
    general: {
      theme: 'Theme', themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark',
      lang: 'Language',
    },
    capture: {
      retention: 'Retention (calls)',
      ignoredMethods: 'Ignored methods',
      storage: 'Storage usage',
    },
    mock: {
      locked: 'Mock rules — coming in P1',
      lockedHint: 'Intercept RPC requests and return custom responses. Available in the next release.',
    },
    advanced: {
      clearHistory: 'Clear all history',
      clearHistoryConfirm: 'Type CLEAR to confirm',
      resetSettings: 'Reset all settings',
    },
    about: { version: 'Version', links: 'Resources', changelog: 'Changelog' },
  },
  common: { on: 'On', off: 'Off', cancel: 'Cancel', confirm: 'Confirm', save: 'Save' },
} as const;

export type I18nDict = typeof en;
