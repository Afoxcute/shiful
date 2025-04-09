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
    // Contract function signatures - both official and potential hidden ones
    private static readonly FUNCTION_SIGNATURES = {
        // Official functions in the contract
        CREATE_GAME: '0x25aa99cd', // createGame(GameType)
        JOIN_GAME: '0xee9a31a2',   // joinGame(uint256)
        MAKE_MOVE: '0x57a33a7c',   // makeMove(uint256,Choice)
        END_GAME: '0x3e4372d0',    // _endGame(uint256) - private, shouldn't be callable directly
        
        // Administrative functions
        TRANSFER_OWNERSHIP: '0xf2fde38b', // transferOwnership(address)
        SET_CREATOR_FEE: '0x7917eebd', // setCreatorFee(uint256) - hypothetical
        UPGRADE_CONTRACT: '0x99a88ec4', // upgrade(uint256) - hypothetical
        MODIFY_AUTH: '0xba75bbd8', // modifyAuth(uint256,uint256) - hypothetical
        
        // Potential hidden admin functions  
        EMERGENCY_WITHDRAW: '0xb7a52e03' // emergencyWithdraw(address) - hypothetical backdoor
    };

    // Game Choice enum values
    private static readonly CHOICE = {
        NONE: 0,
        ROCK: 1,
        PAPER: 2,
        SCISSORS: 3
    };

    /**
     * Detects potential security threats, hidden risks, and unauthorized fund access
     * in the RockPaperScissors contract.
     * 
     * This version focuses on detecting:
     * 1. Unauthorized admin operations that could drain funds
     * 2. Storage manipulation that could redirect payouts
     * 3. Attempts to disable withdrawal mechanisms
     * 4. Multisig requirement bypassing
     * 5. Hidden admin functions that could extract funds
     * 6. Suspicious ownership transfers
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
        
        // Check for unauthorized creator fee changes
        if (this.isUnauthorizedCreatorFeeChange(functionSignature, from, request)) {
            return this.createResponse(
                request, 
                true, 
                'Unauthorized attempt to change creator fee'
            );
        }
        
        // Check for suspicious storage modifications that would redirect funds
        if (this.hasSuspiciousStorageModifications(request)) {
            return this.createResponse(
                request, 
                true, 
                'Suspicious storage modification detected'
            );
        }
        
        // Check for attempts to disable withdrawals
        if (this.isAttemptToDisableWithdrawals(functionSignature, request)) {
            return this.createResponse(
                request, 
                true, 
                'Attempt to disable withdrawals detected'
            );
        }
        
        // Check for multisig authorization changes or bypasses
        if (this.isInsufficientMultisigAuthorization(functionSignature, request)) {
            return this.createResponse(
                request, 
                true, 
                'Insufficient signatures for multi-signature operation'
            );
        }
        
        // Check for hidden admin functions
        if (this.isHiddenAdminFunction(functionSignature, request)) {
            return this.createResponse(
                request, 
                true, 
                'Hidden admin function detected'
            );
        }
        
        // Check for suspicious ownership transfers
        if (this.isSuspiciousOwnershipTransfer(functionSignature, request)) {
            return this.createResponse(
                request, 
                true, 
                'Ownership transfer to high-risk address detected'
            );
        }

        // No suspicious activity detected
        return this.createResponse(request, false);
    }
    
    /**
     * Checks if a transaction is attempting to change the creator fee by a non-owner
     * which could allow draining funds through fees
     * 
     * @param functionSignature The function signature from input data
     * @param from Address initiating the transaction
     * @param request Full detection request
     * @returns True if unauthorized fee change detected
     */
    private static isUnauthorizedCreatorFeeChange(
        functionSignature: string,
        from: string,
        request: DetectionRequest
    ): boolean {
        // Not a fee change, return false
        if (functionSignature !== this.FUNCTION_SIGNATURES.SET_CREATOR_FEE) {
            return false;
        }
        
        // Extract contract state from additional data
        const contractState = request.additionalData?.contractState as any;
        if (!contractState || !contractState.owner) {
            return false;
        }
        
        // Check if sender is authorized
        const contractOwner = contractState.owner;
        
        // If sender is not owner, this is unauthorized
        return from.toLowerCase() !== contractOwner.toLowerCase();
    }
    
    /**
     * Checks for suspicious storage modifications that would redirect funds
     * by manipulating player addresses or other critical storage
     * 
     * @param request Full detection request
     * @returns True if suspicious storage modifications detected
     */
    private static hasSuspiciousStorageModifications(request: DetectionRequest): boolean {
        // Check for storage modifications in additional data
        const storageModifications = request.additionalData?.storageModifications as any[];
        if (!storageModifications || !Array.isArray(storageModifications)) {
            return false;
        }
        
        // Check each storage modification
        for (const mod of storageModifications) {
            // If original and modified values differ, this is suspicious
            if (mod.originalValue !== mod.modifiedValue) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Checks if a transaction is attempting to disable withdrawal functionality
     * through contract upgrades or modifications
     * 
     * @param functionSignature The function signature from input data
     * @param request Full detection request
     * @returns True if attempt to disable withdrawals detected
     */
    private static isAttemptToDisableWithdrawals(
        functionSignature: string,
        request: DetectionRequest
    ): boolean {
        // Not an upgrade function, return false
        if (functionSignature !== this.FUNCTION_SIGNATURES.UPGRADE_CONTRACT) {
            return false;
        }
        
        // Extract contract modification details
        const contractMod = request.additionalData?.contractModification as any;
        if (!contractMod || !contractMod.codeAnalysis) {
            return false;
        }
        
        // Check if new implementation blocks withdrawals
        const analysis = contractMod.codeAnalysis;
        
        return analysis.withdrawalBlocked === true || 
               analysis.hasWithdrawalFunction === false;
    }
    
    /**
     * Checks if a transaction lacks sufficient signatures for a multisig operation
     * which could indicate an attempt to bypass security controls
     * 
     * @param functionSignature The function signature from input data
     * @param request Full detection request
     * @returns True if insufficient signatures detected
     */
    private static isInsufficientMultisigAuthorization(
        functionSignature: string,
        request: DetectionRequest
    ): boolean {
        // Only check for auth modification functions
        if (functionSignature !== this.FUNCTION_SIGNATURES.MODIFY_AUTH) {
            return false;
        }
        
        // Extract multisig info
        const multisigInfo = request.additionalData?.multisigInfo as any;
        if (!multisigInfo) {
            return false;
        }
        
        // Check if provided signatures are less than required
        return multisigInfo.providedSignatures < multisigInfo.requiredSignatures;
    }
    
    /**
     * Checks if a transaction is calling a hidden admin function
     * that could be used to extract funds without proper oversight
     * 
     * @param functionSignature The function signature from input data
     * @param request Full detection request
     * @returns True if hidden admin function detected
     */
    private static isHiddenAdminFunction(
        functionSignature: string,
        request: DetectionRequest
    ): boolean {
        // Check if this is a known hidden function
        if (functionSignature !== this.FUNCTION_SIGNATURES.EMERGENCY_WITHDRAW) {
            return false;
        }
        
        // Get function analysis if available
        const functionAnalysis = request.additionalData?.functionAnalysis as any;
        if (!functionAnalysis) {
            return false;
        }
        
        // Check if function is high risk and can transfer funds
        return functionAnalysis.riskLevel === 'high' && 
               functionAnalysis.canTransferFunds === true &&
               functionAnalysis.isDocumented === false;
    }
    
    /**
     * Checks if ownership is being transferred to a suspicious or high-risk address
     * which could indicate an attempt to take over the contract
     * 
     * @param functionSignature The function signature from input data
     * @param request Full detection request
     * @returns True if suspicious ownership transfer detected
     */
    private static isSuspiciousOwnershipTransfer(
        functionSignature: string,
        request: DetectionRequest
    ): boolean {
        // Not an ownership transfer, return false
        if (functionSignature !== this.FUNCTION_SIGNATURES.TRANSFER_OWNERSHIP) {
            return false;
        }
        
        // Extract address risk information
        const addressRisk = request.additionalData?.addressRisk as any;
        if (!addressRisk || !addressRisk.riskScore) {
            return false;
        }
        
        // Check if risk score exceeds threshold (75 out of 100)
        return addressRisk.riskScore > 75;
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
