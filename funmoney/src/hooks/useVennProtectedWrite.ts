import { useWriteContract, useAccount, useChainId } from 'wagmi';
import { encodeFunctionData } from 'viem';
import vennClient, { Transaction } from '../services/VennClient';
import { toast } from 'react-hot-toast';
import { extractErrorMessages } from '../utils';

// Type for the protected write function parameters
type WriteContractParams = {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};

/**
 * A hook that enhances wagmi's useWriteContract with Venn transaction protection
 */
export function useVennProtectedWrite() {
  const { data: hash, error, isPending, writeContract } = useWriteContract();
  const { address } = useAccount();
  const chainId = useChainId();

  /**
   * Executes a contract write with Venn protection
   * @param params Contract write parameters
   */
  const protectedWrite = async (params: WriteContractParams) => {
    if (!address) {
      toast.error('Wallet not connected');
      return;
    }

    const toastId = toast.loading('Preparing transaction with Venn protection...', {
      duration: 3000,
    });

    try {
      // Log transaction parameters safely by converting BigInt values to strings
      console.log('Protected write params:', {
        address: params.address,
        functionName: params.functionName,
        value: params.value ? params.value.toString() : '0',
        args: params.args ? Array.from(params.args).map(arg => 
          typeof arg === 'bigint' ? arg.toString() : arg
        ) : []
      });
      
      // Prepare arguments for encoding, converting readonly array to regular array
      const argsArray: unknown[] = params.args ? [...params.args] : [];
      
      // Encode the transaction data for the contract call using viem
      const encodedData = encodeFunctionData({
        abi: params.abi,
        functionName: params.functionName,
        args: argsArray,
      });

      console.log('Encoded data:', encodedData);

      // Create the transaction object for Venn approval
      const transaction: Transaction = {
        from: address,
        to: params.address,
        data: encodedData,
        value: params.value || BigInt(0),
        chainId
      };

      // Get Venn approval for the transaction
      toast.loading('Getting Venn approval...', { id: toastId });
      console.log('Sending transaction for Venn approval...');
      
      const approvedTx = await vennClient.approveTransaction(transaction);
      console.log('Received approved transaction from Venn:', {
        from: approvedTx.from,
        to: approvedTx.to,
        value: typeof approvedTx.value === 'bigint' ? approvedTx.value.toString() : approvedTx.value,
        data: approvedTx.data.substring(0, 10) + '...' // Only log the function selector for brevity
      });

      // Execute the transaction with the protected data from Venn
      toast.loading('Sending approved transaction...', { id: toastId });
      
      // Create the write parameters with proper type handling
      const writeParams: any = {
        address: params.address,
        abi: params.abi,
        data: approvedTx.data,
      };
      
      // Only add value if it's defined to avoid type errors
      if (params.value !== undefined) {
        writeParams.value = params.value;
      }
      
      // Execute the transaction
      console.log('Submitting transaction with data:', writeParams.data.substring(0, 10) + '...');
      await writeContract(writeParams);

      toast.success('Transaction submitted with Venn protection', { id: toastId });
    } catch (err) {
      console.error('Error with Venn protected transaction:', err);
      
      const errorMessage = err instanceof Error 
        ? extractErrorMessages(err.message) 
        : 'Failed to execute protected transaction';
      
      toast.error(errorMessage, { id: toastId });
    }
  };

  return {
    hash,
    error,
    isPending,
    protectedWrite
  };
} 