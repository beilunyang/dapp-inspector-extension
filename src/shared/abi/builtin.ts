import { parseAbi, toFunctionSelector, type AbiFunction } from 'viem';

// Bundled standard interfaces. Anything that ships in the extension
// resolves at zero latency and works fully offline.
//
// Selector collisions across standards are handled "first wins" — the
// shared selectors (e.g. transferFrom across ERC-20 and ERC-721) decode
// identically since both standards declare the same parameter types,
// so the only thing the user "loses" is the param name semantics
// (we name uint256 args generically; risk detection keys off function
// name + value, not the param label).

const ERC20 = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

const ERC721 = parseAbi([
  'function setApprovalForAll(address operator, bool approved)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)',
]);

const ERC1155 = parseAbi([
  'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
  'function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)',
]);

const PERMIT2 = parseAbi([
  'function approve(address token, address spender, uint160 amount, uint48 expiration)',
  'function transferFrom(address from, address to, uint160 amount, address token)',
]);

export const BUILTIN_ABIS = {
  ERC20,
  ERC721,
  ERC1155,
  PERMIT2,
} as const;

const SELECTOR_INDEX: Map<`0x${string}`, AbiFunction> = (() => {
  const m = new Map<`0x${string}`, AbiFunction>();
  for (const abi of Object.values(BUILTIN_ABIS)) {
    for (const item of abi) {
      if (item.type !== 'function') continue;
      const fn = item as AbiFunction;
      const sel = toFunctionSelector(fn);
      if (!m.has(sel)) m.set(sel, fn);
    }
  }
  return m;
})();

export function findBuiltinFunction(selector: `0x${string}`): AbiFunction | undefined {
  return SELECTOR_INDEX.get(selector.toLowerCase() as `0x${string}`);
}

/** Exposed for tests so we can assert coverage. */
export function builtinSelectorCount(): number {
  return SELECTOR_INDEX.size;
}
