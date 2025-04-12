import { VennClient as VennSDK, errors } from '@vennbuild/venn-dapp-sdk';

// Transaction interface defining the structure of a transaction to be approved
export interface Transaction {
  from: string;
  to: string;
  data: string;
  value: bigint | string;
  chainId?: number;
}

// Singleton VennClient for the application
class VennClient {
  private static instance: VennClient;
  private vennClient: VennSDK | null = null;

  private constructor() {
    // Private constructor to prevent direct construction calls with 'new'
    this.initialize();
  }

  private initialize() {
    const vennURL = process.env.NEXT_PUBLIC_VENN_NODE_URL || 'https://ethereum-holesky.publicnode.com';
    const vennPolicyAddress = process.env.NEXT_PUBLIC_VENN_POLICY_ADDRESS || '0x549b94dC5C2c943397bf3097963a6Da1a94fda2C';

    if (!vennURL || !vennPolicyAddress) {
      console.warn('Venn configuration missing. Transactions will not be protected.');
      return;
    }

    try {
      this.vennClient = new VennSDK({
        vennURL,
        vennPolicyAddress,
        strict: true // Enable strict mode for better error handling
      });
      console.info('Venn client initialized for transaction protection');
    } catch (error) {
      console.error('Failed to initialize Venn client:', error);
    }
  }

  /**
   * Get the singleton instance of VennClient
   */
  public static getInstance(): VennClient {
    if (!VennClient.instance) {
      VennClient.instance = new VennClient();
    }
    return VennClient.instance;
  }

  /**
   * Handles BigInt serialization by converting bigint to string
   * @param transaction The transaction to prepare for Venn
   * @returns A transaction with all BigInt values converted to strings
   */
  private prepareTxForVenn(transaction: Transaction): any {
    // Create a copy of the transaction
    const preparedTx = { ...transaction };
    
    // Convert value to string if it's a BigInt
    if (typeof preparedTx.value === 'bigint') {
      preparedTx.value = preparedTx.value.toString();
    }
    
    return preparedTx;
  }

  /**
   * Approves a transaction with Venn protection
   * @param transaction The transaction to be approved
   * @returns The approved transaction with updated data field
   */
  public async approveTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.vennClient) {
      console.warn('Venn client not initialized. Transaction will not be protected.');
      return transaction;
    }

    try {
      // Prepare transaction for Venn by converting BigInt values to strings
      const preparedTx = this.prepareTxForVenn(transaction);
      
      // Send the prepared transaction to Venn for approval
      const approvedTx = await this.vennClient.approve({
        from: preparedTx.from,
        to: preparedTx.to,
        data: preparedTx.data,
        value: preparedTx.value,
        chainId: preparedTx.chainId
      });

      return {
        ...transaction,
        // Ensure data is always a string, fallback to original if not available
        data: approvedTx.data || transaction.data
      };
    } catch (e) {
      this.handleVennError(e);
      throw e;
    }
  }

  /**
   * Handles errors from the Venn client
   * @param error The error object from Venn
   */
  private handleVennError(error: unknown): void {
    if (!(error instanceof Error)) {
      console.error('Unknown error with Venn transaction approval:', error);
      return;
    }

    switch (error.constructor) {
      case errors.InvalidInitParamsError:
        console.error(`Invalid Venn configuration: ${error.message}`);
        break;
      case errors.ConnectionRefusedError:
        console.error(`Venn connection error: ${error.message}`);
        break;
      case errors.TxRejectedError:
        console.error(`Transaction rejected by Venn: ${error.message}`);
        break;
      default:
        console.error(`Venn error: ${error.message}`);
    }
  }
}

export default VennClient.getInstance(); 