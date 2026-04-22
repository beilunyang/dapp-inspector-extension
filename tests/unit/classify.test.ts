import { describe, it, expect } from 'vitest';
import { classify } from '@shared/classify';

describe('classify', () => {
  it('classifies read methods', () => {
    expect(classify('eth_call')).toBe('read');
    expect(classify('eth_getBalance')).toBe('read');
    expect(classify('eth_blockNumber')).toBe('read');
    expect(classify('net_version')).toBe('read');
    expect(classify('eth_chainId')).toBe('read');
  });
  it('classifies write methods', () => {
    expect(classify('eth_sendTransaction')).toBe('write');
    expect(classify('eth_sendRawTransaction')).toBe('write');
  });
  it('classifies sign methods', () => {
    expect(classify('personal_sign')).toBe('sign');
    expect(classify('eth_sign')).toBe('sign');
    expect(classify('eth_signTypedData_v4')).toBe('sign');
    expect(classify('wallet_requestPermissions')).toBe('sign');
    expect(classify('wallet_switchEthereumChain')).toBe('sign');
  });
  it('classifies subscribe methods', () => {
    expect(classify('eth_subscribe')).toBe('subscribe');
    expect(classify('eth_unsubscribe')).toBe('subscribe');
  });
  it('defaults unknown methods to read', () => {
    expect(classify('unknown_method')).toBe('read');
    expect(classify('custom_rpc')).toBe('read');
  });
});
