import { DetectionRequest, DetectionResponse } from './dtos'

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
    // Contract function signatures
    private static readonly FUNCTION_SIGNATURES = {
        CREATE_GAME: '0x25aa99cd', // createGame(GameType)
        JOIN_GAME: '0xee9a31a2',   // joinGame(uint256)
        MAKE_MOVE: '0x57a33a7c',   // makeMove(uint256,Choice)
        END_GAME: '0x3e4372d0'     // _endGame(uint256) - private, shouldn't be callable directly
    };

    // Game Choice enum values
    private static readonly CHOICE = {
        NONE: 0,
        ROCK: 1,
        PAPER: 2,
        SCISSORS: 3
    };

    /**
     * Detects unusual or potentially malicious transaction patterns for the
     * RockPaperScissors game contract.
     * 
     * Focuses on multisig security by checking for:
     * 1. Unauthorized players attempting moves
     * 2. Rapid sequential moves (potential double-signing)
     * 3. Unusual stake patterns
     * 4. Frontrunning attacks
     * 5. Direct calls to private functions (contract manipulation)
     * 
     * @param request The detection request containing transaction details
     * @returns DetectionResponse with detection results
     */
    public static detect(request: DetectionRequest): DetectionResponse {
        // Extract key information
        const { from, to, input, calls } = request.trace;
        
        // Skip detection for transactions not related to our contract
        if (to.toLowerCase() !== request.protocolAddress?.toLowerCase()) {
            return this.createResponse(request, false);
        }

        // Extract function signature (first 4 bytes of calldata)
        const functionSignature = input.slice(0, 10);
        
        // Check for premature game ending attempts FIRST
        // This has higher priority than the direct private function call check
        if (this.isAttemptToEndGamePrematurely(functionSignature, request)) {
            return this.createResponse(
                request, 
                true, 
                'Attempt to end game prematurely detected'
            );
        }

        // Check for direct calls to private functions
        if (this.isDirectPrivateFunctionCall(functionSignature)) {
            return this.createResponse(
                request, 
                true, 
                'Suspicious direct call to private function detected'
            );
        }

        // Check for unauthorized players
        if (this.isUnauthorizedPlayerMove(functionSignature, from, request)) {
            return this.createResponse(
                request, 
                true, 
                'Unauthorized player attempting to make move'
            );
        }

        // Check for rapid sequential moves
        if (this.isRapidSequentialMoves(calls, from)) {
            return this.createResponse(
                request, 
                true, 
                'Suspicious rapid sequential moves detected'
            );
        }

        // Check for frontrunning attempts
        if (this.isPotentialFrontrunning(request)) {
            return this.createResponse(
                request, 
                true, 
                'Potential frontrunning attack detected'
            );
        }

        // Check for unusual stake patterns
        if (this.hasUnusualStakePattern(functionSignature, request)) {
            return this.createResponse(
                request, 
                true, 
                'Unusual stake pattern detected'
            );
        }

        // No suspicious activity detected
        return this.createResponse(request, false);
    }

    /**
     * Checks if the transaction is attempting to directly call a private function
     * 
     * @param functionSignature The function signature from input data
     * @returns True if a private function is being called directly
     */
    private static isDirectPrivateFunctionCall(functionSignature: string): boolean {
        // Check for private function signatures (like _endGame)
        return functionSignature === this.FUNCTION_SIGNATURES.END_GAME;
    }

    /**
     * Checks if a transaction is trying to end a game before it's properly finished
     * according to game rules.
     * 
     * @param functionSignature The function signature from input data
     * @param request The full detection request
     * @returns True if attempting to end game prematurely
     */
    private static isAttemptToEndGamePrematurely(
        functionSignature: string, 
        request: DetectionRequest
    ): boolean {
        // If signature doesn't match end game, return false
        if (functionSignature !== this.FUNCTION_SIGNATURES.END_GAME) {
            return false;
        }

        // Check if additionalData contains game state
        const gameState = request.additionalData?.gameState as any;
        if (!gameState) {
            return false;
        }

        // Game can only end when roundsPlayed indicates game should be over
        const { roundsPlayed, scores, gameType } = gameState;
        
        if (gameType === 0) { // OneRound
            return roundsPlayed < 1;
        } else if (gameType === 1) { // BestOfThree
            return scores[0] < 2 && scores[1] < 2;
        } else { // BestOfFive
            return scores[0] < 3 && scores[1] < 3;
        }
    }

    /**
     * Checks if the transaction is from an unauthorized player
     * by comparing the sender against the registered players for the game.
     * 
     * @param functionSignature The function signature from input data
     * @param from The address sending the transaction
     * @param request The full detection request
     * @returns True if sender is not an authorized player for the game
     */
    private static isUnauthorizedPlayerMove(
        functionSignature: string,
        from: string, 
        request: DetectionRequest
    ): boolean {
        // Only check makeMove function calls
        if (functionSignature !== this.FUNCTION_SIGNATURES.MAKE_MOVE) {
            return false;
        }

        // Extract game state from additional data if available
        const gameState = request.additionalData?.gameState as any;
        if (!gameState || !gameState.players) {
            return false;
        }

        // Check if sender is one of the registered players
        const players = gameState.players as string[];
        return !players.some(player => 
            player.toLowerCase() === from.toLowerCase()
        );
    }

    /**
     * Checks for rapid sequential moves from the same player,
     * which could indicate an attack or double-signing issue.
     * 
     * @param calls Array of calls in the transaction
     * @param from The address sending the transaction
     * @returns True if rapid sequential moves from same address are detected
     */
    private static isRapidSequentialMoves(
        calls?: DetectionRequest['trace']['calls'],
        from?: string
    ): boolean {
        if (!calls || calls.length < 2 || !from) {
            return false;
        }

        // Look for multiple calls from the same address
        const callsFromSameAddress = calls.filter(call => 
            call.from.toLowerCase() === from.toLowerCase()
        );

        // If we have multiple calls from the same address, this is suspicious
        return callsFromSameAddress.length >= 2;
    }

    /**
     * Detects potential frontrunning attacks by examining gas price
     * and timing relative to other pending transactions.
     * 
     * @param request The full detection request
     * @returns True if frontrunning patterns are detected
     */
    private static isPotentialFrontrunning(request: DetectionRequest): boolean {
        // Check for additional frontrunning indicators
        const additionalData = request.additionalData;
        if (!additionalData) {
            return false;
        }

        // Check for high gas price (potential frontrunning indicator)
        const gasPrice = additionalData.gasPrice as string;
        const pendingTransactions = additionalData.pendingTransactions as any[];
        const timingData = additionalData.timingData as any;
        
        if (!gasPrice || !pendingTransactions || !timingData) {
            return false;
        }
        
        // If gas price is abnormally high and there are pending transactions
        // from other players, and the time delta is small, suspect frontrunning
        const isHighGasPrice = BigInt(gasPrice) > BigInt(30000000000); // > 30 Gwei
        const hasRecentPendingTx = pendingTransactions.length > 0;
        const isQuickSubmission = timingData.submissionTimeDelta < 2; // Less than 2 seconds
        
        return isHighGasPrice && hasRecentPendingTx && isQuickSubmission;
    }

    /**
     * Detects unusual stake patterns that may indicate automated exploitation
     * or other suspicious activity.
     * 
     * @param functionSignature The function signature from input data
     * @param request The full detection request
     * @returns True if unusual stake patterns are detected
     */
    private static hasUnusualStakePattern(
        functionSignature: string,
        request: DetectionRequest
    ): boolean {
        // Only check game creation calls
        if (functionSignature !== this.FUNCTION_SIGNATURES.CREATE_GAME) {
            return false;
        }

        // Check for game creation history
        const additionalData = request.additionalData;
        if (!additionalData || !additionalData.gameCreationHistory) {
            return false;
        }

        const history = additionalData.gameCreationHistory as any[];
        if (history.length < 5) {
            return false;
        }

        // Look for patterns in time and stake
        const timeDeltas: number[] = [];
        let sameStakeCount = 0;
        const firstStake = history[0].stake;
        
        // Calculate time deltas between consecutive games
        for (let i = 1; i < history.length; i++) {
            timeDeltas.push(history[i].timestamp - history[i-1].timestamp);
            if (history[i].stake === firstStake) {
                sameStakeCount++;
            }
        }
        
        // Check for consistent time intervals (automated creation)
        const avgTimeDelta = timeDeltas.reduce((sum, delta) => sum + delta, 0) / timeDeltas.length;
        const timeConsistency = timeDeltas.every(delta => 
            Math.abs(delta - avgTimeDelta) < avgTimeDelta * 0.3
        );
        
        // If time between creations is very consistent AND stakes are the same,
        // this suggests automated exploitation
        return timeConsistency && sameStakeCount >= history.length - 1;
    }

    /**
     * Creates a standardized detection response
     * 
     * @param request The original detection request
     * @param detected Whether suspicious activity was detected
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
