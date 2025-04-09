import { name, version } from '@root/package.json'
import request from 'supertest'

import { app, server } from '@/app'
import { DetectionRequest, DetectionResponse } from '@/modules/detection-module/dtos'
import { HTTP_STATUS_CODES } from '@/types'

const ethereumAddress = '0xfdD055Cf3EaD343AD51f4C7d1F12558c52BaDFA5'
const zeroAddress = '0x0000000000000000000000000000000000000000'
const contractAddress = '0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1' // RPS contract address
const player1Address = '0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045' // First player
const player2Address = '0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990' // Second player
const maliciousAddress = '0x4206904396d558D6fA240E0F788d30C831D4a6E7' // Malicious actor
const contractOwner = '0x8A7F7c5b0083eB7f8C3ba11dF9E37a5ac501B972' // Contract owner

describe('Service Tests', () => {
    afterAll(async () => {
        server.close()
    })

    describe('App Controller', () => {
        test('version', async () => {
            // Arrange
            const expectedData = { version, name }

            // Act
            const response = await request(app).get('/app/version')

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK)
            expect(response.body).toEqual(expectedData)
        })

        test('health check', async () => {
            // Arrange
            const expectedData = { message: 'OK' }

            // Act
            const response = await request(app).get('/app/health-check')

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK)
            expect(response.body).toEqual(expectedData)
        })
    })

    describe('RockPaperScissors Security Threats Detection', () => {
        // Base request payload for testing
        const createBaseRequestPayload = (from: string, to: string, input: string): Partial<DetectionRequest> => ({
            id: 'rps-detection-test',
            detectorName: 'rps-security-detector',
            chainId: 17000, // Holesky testnet chainId
            hash: '0x' + Math.random().toString(16).substring(2, 14),
            protocolName: 'RockPaperScissors',
            protocolAddress: contractAddress,
            trace: {
                blockNumber: 12345,
                from: from,
                to: to,
                transactionHash: '0x' + Math.random().toString(16).substring(2, 14),
                input: input,
                output: '0x',
                gas: '100000',
                gasUsed: '62500',
                value: '10000000000000000', // 0.01 ETH
                pre: {
                    [from]: {
                        balance: '0x100000000000000000000',
                        nonce: 5,
                    },
                    [to]: {
                        balance: '0x0',
                        code: '0x608060405234801561001057600080fd5b50600436106100cf5760003560e01c8063981b24d011610...'
                    }
                },
                post: {
                    [from]: {
                        balance: '0xff000000000000000000',
                    },
                    [to]: {
                        balance: '0x10000000000000000',
                    }
                },
                logs: [],
                calls: []
            },
        });

        /**
         * Test Case 1: Attempt to change creator fee by non-owner
         * 
         * This test verifies that an unauthorized account cannot modify the creator fee
         * which would allow funds to be drained from the contract
         * Should trigger detection
         */
        test('should detect unauthorized creator fee change', async () => {
            // Simulated function signature for changing creatorFee (not in actual contract but would be a risk)
            const setCreatorFeeInput = '0x7917eebd0000000000000000000000000000000000000000000000000000000000000064'; // setCreatorFee(100) - 100%
            
            const requestPayload = createBaseRequestPayload(
                maliciousAddress, 
                contractAddress,
                setCreatorFeeInput
            );
            
            // Add contract state info
            requestPayload.additionalData = {
                contractState: {
                    owner: contractOwner,
                    currentCreatorFee: 25 // Current fee is 2.5%
                }
            };

            // Act
            const response = await request(app)
                .post('/detect')
                .send(requestPayload)
                .set('Content-Type', 'application/json');

            const body: DetectionResponse = response.body;

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK);
            expect(body.detected).toBe(true);
            expect(body.message).toContain('Unauthorized attempt to change creator fee');
        });

        /**
         * Test Case 2: Suspicious withdrawal pattern
         * 
         * This test simulates an attempt to drain funds by forcing an early game end
         * with a tie result that splits funds but manipulates the recipient addresses
         * Should trigger detection
         */
        test('should detect suspicious fund withdrawal pattern', async () => {
            // _endGame function with logic to manipulate withdrawal
            const maliciousEndGameInput = '0x3e4372d00000000000000000000000000000000000000000000000000000000000000001';
            
            const requestPayload = createBaseRequestPayload(
                maliciousAddress,
                contractAddress,
                maliciousEndGameInput
            );
            
            // Add storage manipulation that would redirect funds
            requestPayload.additionalData = {
                storageModifications: [
                    {
                        slot: '0x12', // Hypothetical storage slot for player addresses
                        originalValue: `0x000000000000000000000000${player1Address.substring(2)}`,
                        modifiedValue: `0x000000000000000000000000${maliciousAddress.substring(2)}`
                    }
                ],
                gameState: {
                    gameId: 1,
                    players: [player1Address, player2Address],
                    stake: '1000000000000000000', // 1 ETH
                    isActive: true
                }
            };

            // Act
            const response = await request(app)
                .post('/detect')
                .send(requestPayload)
                .set('Content-Type', 'application/json');

            const body: DetectionResponse = response.body;

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK);
            expect(body.detected).toBe(true);
            expect(body.message).toContain('Suspicious storage modification detected');
        });

        /**
         * Test Case 3: Owner attempting to disable withdrawals
         * 
         * This test simulates a scenario where the contract owner is trying to 
         * modify the contract to temporarily or permanently block withdrawals
         * Should trigger detection
         */
        test('should detect attempt to disable withdrawals', async () => {
            // Simulated function for upgrading or modifying contract
            const upgradeContractInput = '0x99a88ec40000000000000000000000000000000000000000000000000000000000000001';
            
            const requestPayload = createBaseRequestPayload(
                contractOwner,
                contractAddress,
                upgradeContractInput
            );
            
            // Add implementation details that would block withdrawals
            requestPayload.additionalData = {
                contractModification: {
                    type: 'upgrade',
                    newImplementation: '0xC8F68Eccf2F05F32d29A8e949fDA3A222f6a9Bd7',
                    codeAnalysis: {
                        hasSelfDestruct: false,
                        hasWithdrawalFunction: false, // New implementation missing withdrawal
                        hasTimelock: true,
                        withdrawalBlocked: true
                    }
                }
            };

            // Act
            const response = await request(app)
                .post('/detect')
                .send(requestPayload)
                .set('Content-Type', 'application/json');

            const body: DetectionResponse = response.body;

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK);
            expect(body.detected).toBe(true);
            expect(body.message).toContain('Attempt to disable withdrawals detected');
        });

        /**
         * Test Case 4: Multisig authorization hijacking
         * 
         * This test simulates an attack where a transaction attempts to 
         * change the requirements for signatures/authorization
         * Should trigger detection
         */
        test('should detect multisig authorization changes', async () => {
            // Function to modify the game players' authorization requirements
            const modifyAuthInput = '0xba75bbd80000000000000000000000000000000000000000000000000000000000000001' +
                               '0000000000000000000000000000000000000000000000000000000000000001'; // Reduce required auth
            
            const requestPayload = createBaseRequestPayload(
                maliciousAddress,
                contractAddress,
                modifyAuthInput
            );
            
            // This would be a privileged operation requiring both player signatures
            requestPayload.additionalData = {
                multisigInfo: {
                    requiredSignatures: 2,
                    providedSignatures: 1,
                    signers: [maliciousAddress],
                    authorizedSigners: [player1Address, player2Address]
                }
            };

            // Act
            const response = await request(app)
                .post('/detect')
                .send(requestPayload)
                .set('Content-Type', 'application/json');

            const body: DetectionResponse = response.body;

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK);
            expect(body.detected).toBe(true);
            expect(body.message).toContain('Insufficient signatures for multi-signature operation');
        });

        /**
         * Test Case 5: Hidden admin function detection
         * 
         * This test verifies that hidden or backdoor admin functions 
         * that could be used to extract funds are detected
         * Should trigger detection
         */
        test('should detect calls to hidden admin functions', async () => {
            // A function signature that's not documented or appears innocuous
            const hiddenAdminFuncInput = '0xb7a52e03000000000000000000000000c8f68eccf2f05f32d29a8e949fda3a222f6a9bd7';
            
            const requestPayload = createBaseRequestPayload(
                contractOwner,
                contractAddress,
                hiddenAdminFuncInput
            );
            
            // Add analysis that reveals this is an uncommon function
            requestPayload.additionalData = {
                functionAnalysis: {
                    functionName: 'emergencyWithdraw',
                    visibility: 'external',
                    isDocumented: false,
                    callCount: 0, // Never been called before
                    accessControl: 'owner',
                    riskLevel: 'high',
                    canTransferFunds: true
                }
            };

            // Act
            const response = await request(app)
                .post('/detect')
                .send(requestPayload)
                .set('Content-Type', 'application/json');

            const body: DetectionResponse = response.body;

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK);
            expect(body.detected).toBe(true);
            expect(body.message).toContain('Hidden admin function detected');
        });

        /**
         * Test Case 6: Ownership transfer to suspicious address
         * 
         * This test confirms detection of ownership being transferred to 
         * a suspicious or high-risk address
         * Should trigger detection
         */
        test('should detect ownership transfer to suspicious address', async () => {
            // Function signature for transferOwnership
            const transferOwnershipInput = '0xf2fde38b000000000000000000000000c8f68eccf2f05f32d29a8e949fda3a222f6a9bd7';
            
            const requestPayload = createBaseRequestPayload(
                contractOwner,
                contractAddress,
                transferOwnershipInput
            );
            
            // Add risk score for the new owner address
            requestPayload.additionalData = {
                addressRisk: {
                    address: '0xC8F68Eccf2F05F32d29A8e949fDA3A222f6a9Bd7',
                    riskScore: 85, // High risk score
                    riskFactors: [
                        'associated_with_hacks',
                        'newly_created',
                        'low_transaction_history',
                        'mixer_interaction'
                    ],
                    analysis: 'Address exhibits multiple high-risk characteristics'
                }
            };

            // Act
            const response = await request(app)
                .post('/detect')
                .send(requestPayload)
                .set('Content-Type', 'application/json');

            const body: DetectionResponse = response.body;

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK);
            expect(body.detected).toBe(true);
            expect(body.message).toContain('Ownership transfer to high-risk address detected');
        });

        /**
         * Test Case 7: Legitimate owner operation
         * 
         * This test verifies that legitimate owner operations don't trigger false positives
         * Should NOT trigger detection
         */
        test('should not detect legitimate owner operations', async () => {
            // Function to change creator fee by legitimate owner
            const setCreatorFeeInput = '0x7917eebd0000000000000000000000000000000000000000000000000000000000000019'; // setCreatorFee(25) - 2.5%
            
            const requestPayload = createBaseRequestPayload(
                contractOwner,
                contractAddress,
                setCreatorFeeInput
            );
            
            // Add contract state info
            requestPayload.additionalData = {
                contractState: {
                    owner: contractOwner,
                    currentCreatorFee: 25 // Keeping the same fee
                }
            };

            // Act
            const response = await request(app)
                .post('/detect')
                .send(requestPayload)
                .set('Content-Type', 'application/json');

            const body: DetectionResponse = response.body;

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK);
            expect(body.detected).toBe(false);
        });
    });

    describe('Detection Controller Validation', () => {
        const requestPayload: Partial<DetectionRequest> = {
            id: 'unique-id',
            detectorName: 'test-detector',
            chainId: 1,
            hash: 'some hash',
            protocolName: 'some protocol',
            protocolAddress: zeroAddress,
            trace: {
                blockNumber: 12345,
                from: ethereumAddress,
                to: ethereumAddress,
                transactionHash: 'some hash',
                input: 'input',
                output: 'output',
                gas: '100000',
                gasUsed: '100',
                value: '10',
                pre: {
                    [zeroAddress]: {
                        balance: '0x..',
                        nonce: 2,
                    },
                },
                post: {
                    [zeroAddress]: {
                        balance: '0x..',
                    },
                },
                logs: [
                    {
                        address: ethereumAddress,
                        data: '0x...',
                        topics: ['0x...'],
                    },
                ],
                calls: [
                    {
                        from: ethereumAddress,
                        to: ethereumAddress,
                        input: 'input',
                        output: 'output',
                        gasUsed: '100',
                        value: '10',
                    },
                ],
            },
        }

        test('detect success', async () => {
            // Act
            const response = await request(app)
                .post('/detect')
                .send(requestPayload)
                .set('Content-Type', 'application/json')

            const body: DetectionResponse = response.body

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK)
            expect(body.protocolName).toBe(requestPayload.protocolName)
            expect(body.protocolAddress).toBe(requestPayload.protocolAddress)
            expect(body.chainId).toBe(requestPayload.chainId)
            expect(body.error).toBeFalsy()
        })

        test('detect validation', async () => {
            const response = await request(app)
                .post('/detect')
                .send({ ...requestPayload, protocolAddress: 'definitely not address' })
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST)
        })

        test('detect validation nested', async () => {
            const response = await request(app)
                .post('/detect')
                .send({
                    ...requestPayload,
                    trace: {
                        ...requestPayload.trace,
                        from: 'not valid address',
                        to: 'not valid as well',
                        logs: [
                            {
                                address: 'not address deeply nested',
                                data: '0x...',
                                topics: ['0x...'],
                            },
                        ],
                    },
                })
                .set('Content-Type', 'application/json')

            expect(response.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST)
            expect(response.body.message).toContain('trace.from')
            expect(response.body.message).toContain('trace.to')
            expect(response.body.message).toContain('trace.logs.0.address')
        })
    })
})
