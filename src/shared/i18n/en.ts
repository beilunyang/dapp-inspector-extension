export const en = {
  panel: {
    count: '{n} calls',
    toolbar: {
      search: 'Filter by method or origin',
      clear: 'Clear',
      export: 'Export',
      settings: 'Settings',
      monitoring: 'Monitoring',
      record: 'Record',
      pause: 'Pause',
      filter: { kind: 'Kind', origin: 'Origin', chain: 'Chain' },
    },
    filters: {
      all: 'All', read: 'Read', write: 'Write', sign: 'Sign',
      errors: 'Errors', mocked: 'Mocked',
    },
    list: { method: 'Method', origin: 'Origin', status: 'Status', duration: 'Time', ts: 'When' },
    detail: {
      tabs: { params: 'Parameters', result: 'Result', timing: 'Timing', raw: 'Raw' },
      sec: {
        params: 'Request parameters',
        result: 'Return value',
        timing: 'Breakdown · {n} ms',
        raw: 'Raw JSON-RPC envelope',
      },
      timing: {
        dapp: 'DApp dispatch',
        queue: 'Queued in extension',
        approval: 'Wallet approval',
        rpc: 'RPC roundtrip',
        return: 'Return to DApp',
      },
      replay: 'Replay', mock: 'Mock', block: 'Block',
      disabledHint: 'P1 feature — coming soon',
      empty: 'Select a call to inspect',
    },
    status: {
      connected: 'Connected',
      idle: 'Idle',
      total: '{n} calls captured',
      shortcut: 'Search · {k}',
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
    openPanel: 'Open DevTools panel',
    currentTab: 'Current tab',
    detected: 'DApp detected',
    provider: 'Provider',
    chain: 'Chain',
    last: 'Last',
    calls120: '{n} calls / 120s',
    agoS: '{n}s ago',
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
};

export type I18nDict = typeof en;
