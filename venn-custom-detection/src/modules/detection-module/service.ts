import { DetectionRequest, DetectionResponse } from './dtos'

// Define interfaces for the various context objects
interface MempoolContext {
    blockTransactions?: Transaction[];
    pendingTransactions?: Transaction[];
    currentTransaction?: Transaction;
    priceImpact?: {
        before: string;
        after: string;
    };
    similarityAnalysis?: {
        isExactCopy: boolean;
        inputSimilarity: string;
    };
}

interface BlockchainContext {
    isReorg?: boolean;
    reorgDepth?: number;
    blockNumber?: number;
    timestamp?: number;
}

interface LiquidityContext {
    recentLiquidityEvents?: LiquidityEvent[];
    liquidityDuration?: number;
}

interface OracleContext {
    recentOracleUpdates?: OracleUpdate[];
    volatilityAnalysis?: {
        normalVolatility: string;
        attackVolatility: string;
        confidenceScore: number;
    };
}

interface MultisigInfo {
    presentPlayers: number;
    requiredPlayers: number;
}

interface Transaction {
    hash: string;
    from: string;
    to: string;
    gasPrice: string;
    input: string;
}

interface GameTransaction extends Transaction {
    stake?: string;
}

interface LiquidityEvent {
    type: string;
    address: string;
    amount: string;
}

interface OracleUpdate {
    oldValue: string;
    newValue: string;
    updater: string;
}

/**
 * DetectionService
 *
 * Implements a `detect` method that receives an enriched view of an
 * EVM compatible transaction (i.e. `DetectionRequest`)
 * and returns a `DetectionResponse`
 *
 * API Reference:
 * https://github.com/ironblocks/venn-custom-detection/blob/master/docs/requests-responses.docs.md
 */
export class DetectionService {
    // Contract function signatures for the RockPaperScissors game
    private static readonly FUNCTION_SIGNATURES = {
        // Official game functions
        CREATE_GAME: '0x25aa99cd', // createGame(GameType)
        JOIN_GAME: '0xee9a31a2',   // joinGame(uint256)
        MAKE_MOVE: '0x57a33a7c',   // makeMove(uint256,Choice)
        END_GAME: '0x3e4372d0',    // _endGame(uint256) - private
        
        // Known addresses for players (multisig participants)
        PLAYER1: '0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        PLAYER2: '0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990'
    };

    // High-risk addresses known for MEV activity
    private static readonly KNOWN_MEV_ADDRESSES = [
        '0x4206904396d558D6fA240E0F788d30C831D4a6E7'.toLowerCase(),
        '0xC8F68Eccf2F05F32d29A8e949fDA3A222f6a9Bd7'.toLowerCase()
    ];

    /**
     * Detects value extraction attacks like sandwich trading and MEV attacks
     * in the RockPaperScissors contract.
     * 
     * This method analyzes the transaction for patterns indicating:
     * 1. Sandwich attacks targeting high-value games
     * 2. Time-bandit attacks through chain reorganization
     * 3. JIT (Just-In-Time) liquidity attacks
     * 4. Attempts to bypass multisig validation
     * 5. Oracle manipulation affecting game outcomes
     * 6. Generalized frontrunning attacks
     * 
     * @param request The detection request containing transaction details
     * @returns DetectionResponse with detection results
     */
    public static detect(request: DetectionRequest): DetectionResponse {
        // Extract key information
        const { from, to, input } = request.trace;
        
        // Skip detection for transactions not related to our contract
        if (to.toLowerCase() !== request.protocolAddress?.toLowerCase()) {
            return this.createResponse(request, false);
        }

        // Extract function signature (first 4 bytes of calldata)
        const functionSignature = input.slice(0, 10);
        
        // Check for sandwich attack patterns
        if (this.isSandwichAttackPattern(request)) {
            return this.createResponse(
                request, 
                true, 
                'Sandwich attack pattern detected: Transaction is part of a sandwich attack that may extract value from players'
            );
        }
        
        // Check for time-bandit attacks (chain reorganization)
        if (this.isTimeBanditAttack(request)) {
            return this.createResponse(
                request, 
                true, 
                'Time-bandit attack detected: Potential chain reorganization targeting high-value games'
            );
        }
        
        // Check for JIT liquidity attacks
        if (this.isJITLiquidityAttack(request)) {
            return this.createResponse(
                request, 
                true, 
                'JIT liquidity attack detected: Temporary liquidity provision to extract fees from players'
            );
        }
        
        // Check for attempts to bypass multisig validation
        if (this.isMultisigValidationBypass(functionSignature, request)) {
            return this.createResponse(
                request, 
                true, 
                'Multisig validation bypass attempt detected: Transaction attempts to circumvent two-player validation'
            );
        }
        
        // Check for oracle manipulation
        if (this.isOracleManipulation(request)) {
            return this.createResponse(
                request, 
                true, 
                'Oracle manipulation attack detected: Price feed manipulation could affect game outcomes'
            );
        }
        
        // Check for frontrunning attacks
        if (this.isGeneralizedFrontrunning(request)) {
            return this.createResponse(
                request, 
                true, 
                'Generalized frontrunning attack detected: Transaction copies player moves with higher gas price'
            );
        }

        // No attack pattern detected
        return this.createResponse(request, false);
    }
    
        /**
     * Checks if the transaction is part of a sandwich attack pattern
     * 
     * Sandwich attacks occur when an attacker observes a pending transaction,
     * then executes transactions before and after it to profit from price movements.
     * 
     * @param request The detection request
     * @returns True if a sandwich attack pattern is detected
     */
    private static isSandwichAttackPattern(request: DetectionRequest): boolean {
        const mempoolContext = request.additionalData?.mempoolContext as MempoolContext;
        if (!mempoolContext || !mempoolContext.blockTransactions) {
            return false;
        }
        
        const transactions = mempoolContext.blockTransactions;
        
        // Need at least 3 transactions for a sandwich (before, target, after)
        if (transactions.length < 3) {
            return false;
        }
        
        // Check if the transactions follow the sandwich pattern:
        // 1. Same address for first and last transaction
        // 2. Target transaction in the middle
        // 3. Higher gas price in the attacking transactions
        const firstTx = transactions[0];
        const lastTx = transactions[transactions.length - 1];
        const targetTxHash = request.hash;
        
        // Find target transaction position
        const targetPosition = transactions.findIndex(tx => tx.hash === targetTxHash);
        if (targetPosition <= 0 || targetPosition >= transactions.length - 1) {
            return false;
        }
        
        // Check if first and last transactions are from the same address
        // and gas price is higher than the target transaction
        if (
            firstTx.from.toLowerCase() === lastTx.from.toLowerCase() &&
            this.KNOWN_MEV_ADDRESSES.includes(firstTx.from.toLowerCase()) &&
            parseInt(firstTx.gasPrice) > parseInt(transactions[targetPosition].gasPrice) &&
            parseInt(lastTx.gasPrice) > parseInt(transactions[targetPosition].gasPrice)
        ) {
            // If there's price impact data, check if it shows exploitation
            if (mempoolContext.priceImpact) {
                const beforeImpact = parseFloat(mempoolContext.priceImpact.before);
                const afterImpact = parseFloat(mempoolContext.priceImpact.after);
                
                // If price impact is significant (>1% total), likely a sandwich
                return (beforeImpact + afterImpact) > 1.0;
            }
            
            // Without price impact data, use pattern matching alone
            return true;
        }
        
        return false;
    }
    
    /**
     * Checks if the transaction is part of a time-bandit attack
     * 
     * Time-bandit attacks involve miners/validators reorganizing blocks to
     * extract value from transactions, particularly targeting high-stake games.
     * 
     * @param request The detection request
     * @returns True if a time-bandit attack is detected
     */
    private static isTimeBanditAttack(request: DetectionRequest): boolean {
        const blockchainContext = request.additionalData?.blockchainContext as BlockchainContext;
        if (!blockchainContext) {
            return false;
        }
        
        // Check for blockchain reorganization
        if (blockchainContext.isReorg && blockchainContext.reorgDepth && blockchainContext.reorgDepth > 2) {
            // Deep reorgs (>2 blocks) are suspicious in MEV context
            return true;
        }
        
        return false;
    }
    
    /**
     * Checks if the transaction is part of a JIT (Just-In-Time) liquidity attack
     * 
     * JIT liquidity attacks involve adding liquidity just before a high-value
     * transaction, capturing fees, and removing liquidity immediately after.
     * 
     * @param request The detection request
     * @returns True if a JIT liquidity attack is detected
     */
    private static isJITLiquidityAttack(request: DetectionRequest): boolean {
        const liquidityContext = request.additionalData?.liquidityContext as LiquidityContext;
        if (!liquidityContext || !liquidityContext.recentLiquidityEvents) {
            return false;
        }
        
        const events = liquidityContext.recentLiquidityEvents;
        
        // Check for the JIT pattern: add liquidity -> player tx -> remove liquidity
        const addEvents = events.filter((e: LiquidityEvent) => e.type === 'add');
        const removeEvents = events.filter((e: LiquidityEvent) => e.type === 'remove');
        const playerEvents = events.filter((e: LiquidityEvent) => e.type === 'playerTransaction');
        
        if (addEvents.length === 0 || removeEvents.length === 0 || playerEvents.length === 0) {
            return false;
        }
        
        // Check if there's very short-lived liquidity (typical for JIT attacks)
        // Liquidity provided for less than 30 seconds is suspicious
        if (liquidityContext.liquidityDuration && liquidityContext.liquidityDuration < 30) {
            // Check if liquidity provider is a known MEV address
            const provider = addEvents[0].address.toLowerCase();
            if (this.KNOWN_MEV_ADDRESSES.includes(provider)) {
                return true;
            }
            
            // Check if there's profit from the quick liquidity provision
            const addedAmount = parseFloat(addEvents[0].amount);
            const removedAmount = parseFloat(removeEvents[0].amount);
            
            // If removed amount > added amount, liquidity provider profited
            return removedAmount > addedAmount;
        }
        
        return false;
    }
    
    /**
     * Checks if the transaction attempts to bypass multisig validation
     * 
     * In the RockPaperScissors contract, certain operations require both players
     * to participate. This check detects attempts to circumvent this requirement.
     * 
     * @param functionSignature The function signature in the transaction
     * @param request The detection request
     * @returns True if a multisig validation bypass is detected
     */
    private static isMultisigValidationBypass(
        functionSignature: string,
        request: DetectionRequest
    ): boolean {
        // Check if the transaction is calling the makeMove function
        if (functionSignature !== this.FUNCTION_SIGNATURES.MAKE_MOVE) {
            return false;
        }
        
        // Check if there are nested calls that might bypass validation
        const calls = request.trace.calls || [];
        if (calls.length < 2) {
            return false;
        }
        
        // Look for direct calls to private functions like _endGame
        const suspiciousCalls = calls.filter(call => 
            call.input.startsWith(this.FUNCTION_SIGNATURES.END_GAME)
        );
        
        if (suspiciousCalls.length > 0) {
            // Check multisig context for confirmation
            const multisigInfo = request.additionalData?.multisigInfo as MultisigInfo;
            if (multisigInfo) {
                // If only one player has provided their signature, this is an attack
                return multisigInfo.presentPlayers < multisigInfo.requiredPlayers;
            }
            
            // If we can't confirm from multisig info, err on the side of caution
            return true;
        }
        
        return false;
    }
    
    /**
     * Checks if the transaction is part of an oracle manipulation attack
     * 
     * Oracle manipulation can affect game outcomes by altering random number
     * generation or price feeds used by the contract.
     * 
     * @param request The detection request
     * @returns True if oracle manipulation is detected
     */
    private static isOracleManipulation(request: DetectionRequest): boolean {
        const oracleContext = request.additionalData?.oracleContext as OracleContext;
        if (!oracleContext || !oracleContext.recentOracleUpdates) {
            return false;
        }
        
        const updates = oracleContext.recentOracleUpdates;
        
        // Check for rapid price changes that might indicate manipulation
        if (updates.length < 2) {
            return false;
        }
        
        // Check for large price swings within a short time period
        for (let i = 0; i < updates.length - 1; i++) {
            const oldValue = parseFloat(updates[i].oldValue);
            const newValue = parseFloat(updates[i].newValue);
            
            // Calculate percentage change
            const percentChange = Math.abs((newValue - oldValue) / oldValue) * 100;
            
            // If volatility analysis is available, use it
            if (oracleContext.volatilityAnalysis) {
                const normalVolatility = parseFloat(oracleContext.volatilityAnalysis.normalVolatility);
                const attackVolatility = parseFloat(oracleContext.volatilityAnalysis.attackVolatility);
                const confidenceScore = oracleContext.volatilityAnalysis.confidenceScore;
                
                // If the measured volatility is significantly higher than normal
                // and confidence score is high, likely manipulation
                if (attackVolatility > normalVolatility * 3 && confidenceScore > 0.8) {
                    return true;
                }
            } else {
                // Without volatility analysis, use a simple heuristic
                // Price changes >10% in a short period are suspicious
                if (percentChange > 10) {
                    // Check if updater is a known MEV address
                    const updater = updates[i].updater.toLowerCase();
                    if (this.KNOWN_MEV_ADDRESSES.includes(updater)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Checks if the transaction is a generalized frontrunning attack
     * 
     * Generalized frontrunning occurs when a bot observes profitable transaction
     * patterns in the mempool and copies them with a higher gas price.
     * 
     * @param request The detection request
     * @returns True if generalized frontrunning is detected
     */
    private static isGeneralizedFrontrunning(request: DetectionRequest): boolean {
        const mempoolContext = request.additionalData?.mempoolContext as MempoolContext;
        if (!mempoolContext) {
            return false;
        }
        
        // Check for pending transactions and current transaction
        const pendingTxs = mempoolContext.pendingTransactions || [];
        const currentTx = mempoolContext.currentTransaction;
        
        if (!currentTx || pendingTxs.length === 0) {
            return false;
        }
        
        // Check for similar transactions with lower gas price
        for (const pendingTx of pendingTxs) {
            // Check for identical input data (copying the exact move)
            if (pendingTx.input === currentTx.input) {
                // If the current transaction has higher gas price and is from a different sender
                if (
                    parseInt(currentTx.gasPrice) > parseInt(pendingTx.gasPrice) &&
                    currentTx.from.toLowerCase() !== pendingTx.from.toLowerCase()
                ) {
                    // Check if the frontrunning address is a known MEV bot
                    return this.KNOWN_MEV_ADDRESSES.includes(currentTx.from.toLowerCase());
                }
            }
        }
        
        // Check if similarity analysis is available
        if (mempoolContext.similarityAnalysis) {
            const analysis = mempoolContext.similarityAnalysis;
            
            // If transaction is an exact copy and from a known MEV address
            if (
                analysis.isExactCopy && 
                analysis.inputSimilarity === '100%' &&
                this.KNOWN_MEV_ADDRESSES.includes(currentTx.from.toLowerCase())
            ) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Creates a standardized detection response
     * 
     * @param request The original detection request
     * @param detected Whether an attack was detected
     * @param message Optional message explaining detection reason
     * @returns Formatted DetectionResponse
     */
    private static createResponse(
        request: DetectionRequest, 
        detected: boolean,
        message?: string
    ): DetectionResponse {
        return new DetectionResponse({
            request,
            detectionInfo: {
                detected,
                message
            },
        });
    }
}
