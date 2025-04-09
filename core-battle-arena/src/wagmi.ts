import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  taikoHekla,
  coreDao,
} from "wagmi/chains";
import { http } from 'wagmi';
// import { taikoHekla as taikotemp } from "viem/_types/chains";

// Define Core Testnet chain
const coreTestnet = {
  id: 1115,
  name: 'Core Testnet',
  iconUrl: 'https://images.app.goo.gl/rqMHLjxM8YPaGZHT9',
  iconBackground: '#fff',
  nativeCurrency: { name: 'CORE', symbol: 'tCORE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.test.btcs.network'] },
  },
  blockExplorers: {
    default: { name: 'Core Explorer', url: 'https://scan.test.btcs.network/' },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11' as `0x${string}`,
      blockCreated: 11_907_934,
    },
  },
};

export const config = getDefaultConfig({
  appName: 'RockPaperScissors',
  projectId: '2c22698ed6fa65b5ab4a6acb4af0b952',
  chains: [coreDao, coreTestnet],
  ssr: true,
  transports: {
    [coreDao.id]: http(
      'https://rpc.ankr.com/core'
    ),
    [coreTestnet.id]: http(
      'https://rpc.test.btcs.network'
    ),
  },
});
