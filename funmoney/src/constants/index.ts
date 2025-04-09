import { abi as defaultAbi, contractAddress as defaultAddress, networkName as defaultNetworkName } from './contractInfo';

export const getContractInfo = (chainId?: number) => {
      return {
        abi: defaultAbi,
        contractAddress: defaultAddress,
        networkName: defaultNetworkName
      };
}; 