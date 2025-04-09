import { toast } from 'react-hot-toast';

// Mock implementation of Venn SDK until you can install the actual package
// Replace this with: import { VennClient, errors } from '@ironblocks/venn-dapp-sdk';
class VennClient {
  private vennURL: string;
  private vennPolicyAddress: string;

  constructor({ vennURL, vennPolicyAddress }: { vennURL: string, vennPolicyAddress: string }) {
    this.vennURL = vennURL;
    this.vennPolicyAddress = vennPolicyAddress;
  }

  async approve({ from, to, data, value, chainId }: { 
    from: string, 
    to: string, 
    data: string, 
    value: bigint | string, 
    chainId?: number 
  }) {
    console.log(`Approving transaction with Venn: ${this.vennURL}`);
    console.log(`Policy address: ${this.vennPolicyAddress}`);
    console.log(`Transaction details:`, { from, to, data, value, chainId });

    // In a real implementation, this would make an API call to the Venn endpoint
    // For now, we'll make a direct fetch to simulate the process
    try {
      // Generate a random nonce (in a real implementation, we'd fetch this from the blockchain)
      // For demo purposes, we're using a random number between 1-1000
      const randomNonce = Math.floor(Math.random() * 1000) + 1;
      
      const response = await fetch(this.vennURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_signTransaction',
          params: [{
            from,
            to,
            data,
            value: typeof value === 'bigint' ? `0x${value.toString(16)}` : value,
            chainId: chainId ? `0x${chainId.toString(16)}` : undefined,
            gas: '0x30D40', // 200,000 gas
            gasPrice: '0x3b9aca00', // 1 Gwei
            nonce: `0x${randomNonce.toString(16)}` // Adding nonce parameter
          }]
        }),
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`Venn approval failed: ${result.error.message || JSON.stringify(result.error)}`);
      }
      
      if (!result.result) {
        throw new Error('Venn approval failed: No result returned');
      }
      
      // The result should contain the signed transaction data with Venn's approval
      // In a real integration, we would parse this and extract the necessary fields
      
      // For demonstration purposes, we'll return a specially formatted transaction
      // that indicates it was signed by Venn
      return {
        from,
        to,
        // The key part: use the actual signed data from Venn instead of the original data
        data: result.result.data || data, 
        value
      };
    } catch (error) {
      console.error('Error calling Venn API:', error);
      throw new TxRejectedError(`Failed to get Venn approval: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Error classes to match Venn SDK structure
class InvalidInitParamsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInitParamsError';
  }
}

class ConnectionRefused extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionRefused';
  }
}

class TxRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TxRejectedError';
  }
}

const errors = {
  InvalidInitParamsError,
  ConnectionRefused,
  TxRejectedError
};

// Initialize Venn client with configuration
// Make sure these environment variables are set correctly in your .env.local file
const vennURL = process.env.NEXT_PUBLIC_VENN_NODE_URL || 'https://signer2.testnet.venn.build/api/17000/sign';
const vennPolicyAddress = process.env.NEXT_PUBLIC_VENN_POLICY_ADDRESS || '0x549b94dC5C2c943397bf3097963a6Da1a94fda2C';

const vennClient = new VennClient({ vennURL, vennPolicyAddress });

/**
 * Approves a transaction with the Venn security network before sending it to the blockchain
 * 
 * @param from - The address sending the transaction
 * @param to - The target contract address
 * @param data - The encoded function call data
 * @param value - The ETH value to send with the transaction (in wei)
 * @param chainId - Optional chain ID (will use wallet's chain if not provided)
 * @returns The approved transaction with updated data field containing the Venn signature
 */
export async function approveWithVenn({
  from,
  to,
  data,
  value,
  chainId
}: {
  from: string;
  to: string;
  data: string;
  value: bigint | string;
  chainId?: number;
}) {
  const toastId = toast.loading('Approving transaction with Venn security...', {
    duration: 5000,
  });

  try {
    // Call the Venn approve method
    const approvedTx = await vennClient.approve({
      from,
      to,
      data,
      value,
      chainId
    });

    toast.success('Transaction approved by Venn security', {
      id: toastId,
      duration: 3000,
    });

    // Important: Return the approved transaction data
    return approvedTx;
  } catch (e) {
    console.error('Venn approval error:', e);

    if (!(e instanceof Error)) {
      toast.error(`Unknown error: ${String(e)}`, { id: toastId });
      throw e;
    }

    switch (e.constructor) {
      case InvalidInitParamsError:
        toast.error(`Invalid parameters: ${e.message}`, { id: toastId });
        break;
      case ConnectionRefused:
        toast.error(`Failed to connect to Venn: ${e.message}`, { id: toastId });
        break;
      case TxRejectedError:
        toast.error(`Transaction rejected by Venn: ${e.message}`, { id: toastId });
        break;
      default:
        toast.error(`Error: ${e.message}`, { id: toastId });
    }

    throw e;
  }
}

export { errors }; 