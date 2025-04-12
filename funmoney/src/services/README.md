# Venn Transaction Protection Integration

This directory contains the implementation of Venn transaction protection for the Rock Paper Scissors DApp.

## Overview

[Venn](https://venn.build/) provides a security layer that protects your DApp from various attacks like MEV, front-running, and other unauthorized transactions. The integration ensures that all transactions submitted through the UI are properly signed and approved by Venn's security nodes before being submitted to the blockchain.

## Implementation

The integration consists of:

1. **VennClient (VennClient.ts)**: A singleton service that wraps the Venn SDK and handles transaction approval.
2. **useVennProtectedWrite Hook (useVennProtectedWrite.ts)**: A custom React hook that integrates Venn protection with the wagmi library's contract write functionality.

## Configuration

The Venn client requires the following environment variables:

- `NEXT_PUBLIC_VENN_NODE_URL`: The URL of the Venn security node
- `NEXT_PUBLIC_VENN_POLICY_ADDRESS`: The address of your Venn Policy

These are defined in the `.env.local` file at the root of the project.

## How It Works

1. When a user initiates a transaction (like creating a game, joining a game, or making a move), the `useVennProtectedWrite` hook intercepts the transaction.
2. The transaction data is encoded using viem's `encodeFunctionData` function.
3. The VennClient sends the transaction data to the Venn network for approval.
4. Venn returns a signed transaction with the same parameters but an updated `data` field that includes the security signature.
5. The hook then submits this protected transaction to the blockchain.

## Usage

To use Venn protection in your components:

```tsx
import { useVennProtectedWrite } from '../hooks/useVennProtectedWrite';

function MyComponent() {
  // Use the hook instead of wagmi's useWriteContract
  const { hash, error, isPending, protectedWrite } = useVennProtectedWrite();
  
  const handleAction = async () => {
    // Use protectedWrite instead of writeContract
    await protectedWrite({
      address: contractAddress,
      abi,
      functionName: 'myFunction',
      args: [...],
      value: amount,
    });
  };
  
  // Rest of component
}
```

## Error Handling

The Venn integration includes comprehensive error handling that:

1. Catches and formats Venn-specific errors
2. Provides user-friendly toast notifications
3. Logs detailed error information for debugging

## Security Considerations

- The Venn client is initialized as a singleton to maintain a single point of interaction with the Venn network.
- Strict mode is enabled by default, meaning transactions that fail Venn's security checks will be rejected.
- All transaction parameters are retained (from, to, value) except for the data field, which is modified to include Venn's security signature.

## Future Improvements

- Integration with transaction history tracking
- More detailed feedback on why transactions might be rejected
- Performance optimizations for transaction approval flow 