(() => {
  const info = { uuid: 'test-1', name: 'MockWallet', rdns: 'test.mock.wallet' };
  const provider = {
    request: async ({ method, params }) => {
      if (method === 'eth_chainId') return '0x1';
      if (method === 'eth_blockNumber') return '0x12d687';
      if (method === 'eth_accounts') return ['0x1234567890abcdef1234567890abcdef12345678'];
      if (method === 'personal_sign') {
        await new Promise(r => setTimeout(r, 200));
        return '0x' + 'a'.repeat(130);
      }
      if (method === 'eth_sendTransaction') {
        const err = new Error('user rejected'); err.code = 4001; throw err;
      }
      return null;
    },
    on() {},
  };
  window.ethereum = provider;
  const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info, provider } }));
  window.addEventListener('eip6963:requestProvider', announce);
  announce();
  window.__mockDappReady = true;
})();
