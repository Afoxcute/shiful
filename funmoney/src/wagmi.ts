import { getDefaultConfig } from "@rainbow-me/rainbowkit";

import { http } from 'wagmi';
import { Chain } from 'wagmi/chains';
// import { taikoHekla as taikotemp } from "viem/_types/chains";

// Define custom vennHolesky chain based on hardhat.config.ts
const vennHolesky: Chain = {
  id: 17000,
  name: 'Venn Holesky',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://ethereum-holesky.publicnode.com'],
    },
    public: {
      http: ['https://ethereum-holesky.publicnode.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://holesky.etherscan.io' },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: 'RockPaperScissors',
  projectId: '6ff8eb59587cd5a38c24cc85d30763ea',
  chains: [
    vennHolesky,
    // taikotemp
    // ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === "true" ? [sepolia] : []),
  ],
  ssr: true,
  transports: {
    [vennHolesky.id]: http('https://ethereum-holesky.publicnode.com'),

  },
});
