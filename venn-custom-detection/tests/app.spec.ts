import { name, version } from '@root/package.json'
import request from 'supertest'

import { app, server } from '@/app'
import { DetectionRequest, DetectionResponse } from '@/modules/detection-module/dtos'
import { HTTP_STATUS_CODES } from '@/types'

const ethereumAddress = '0xfdD055Cf3EaD343AD51f4C7d1F12558c52BaDFA5'
const zeroAddress = '0x0000000000000000000000000000000000000000'
const contractAddress = '0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1' // RPS contract address
const player1Address = '0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045' // First player (multisig signer 1)
const player2Address = '0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990' // Second player (multisig signer 2)
const sandwichBotAddress = '0x4206904396d558D6fA240E0F788d30C831D4a6E7' // Sandwich attack bot
const mevBotAddress = '0xC8F68Eccf2F05F32d29A8e949fDA3A222f6a9Bd7' // MEV extraction bot
const liquidityPoolAddress = '0x8A7F7c5b0083eB7f8C3ba11dF9E37a5ac501B972' // Mock liquidity pool

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

    describe('RockPaperScissors Value Extraction Attack Detection', () => {
        // Base request payload for testing
        const createBaseRequestPayload = (from: string, to: string, input: string): Partial<DetectionRequest> => ({
            id: 'rps-attack-detection-test',
            detectorName: 'rps-value-extraction-detector',
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
         * Test Case 1: Classic Sandwich Attack Detection
         * 
         * This test simulates a sandwich attack pattern where an attacker observes a pending game
         * creation with a high stake and tries to manipulate the market before and after the transaction
         * to extract value.
         * 
         * Should trigger detection as this pattern could result in value extraction from players.
         */
        test('should detect classic sandwich attack pattern', async () => {
            // Function signature for createGame(GameType.OneRound) with high stake
            const createGameInput = '0x25aa99cd0000000000000000000000000000000000000000000000000000000000000000';
            
            const requestPayload = createBaseRequestPayload(
                player1Address, 
                contractAddress,
                createGameInput
            );
            
            // Add a mempool context showing sandwich attack pattern
            requestPayload.additionalData = {
                mempoolContext: {
                    blockTransactions: [
                        {
                            hash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
                            from: sandwichBotAddress,
                            to: liquidityPoolAddress,
                            input: '0xabcdef01', // Buy tokens before player's transaction
                            gasPrice: '35000000000', // 35 Gwei
                            blockPosition: 0 // First in block
                        },
                        {
                            hash: requestPayload.hash, // Player's transaction
                            from: player1Address,
                            to: contractAddress,
                            input: createGameInput,
                            value: '1000000000000000000', // 1 ETH stake
                            gasPrice: '30000000000', // 30 Gwei
                            blockPosition: 1 // Second in block
                        },
                        {
                            hash: '0xf9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0',
                            from: sandwichBotAddress,
                            to: liquidityPoolAddress,
                            input: '0xfedcba98', // Sell tokens after player's transaction
                            gasPrice: '35000000000', // 35 Gwei
                            blockPosition: 2 // Third in block
                        }
                    ],
                    priceImpact: {
                        before: '2.5%', // Price impact from first transaction
                        after: '2.7%'   // Price impact from last transaction
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
            expect(body.message).toContain('Sandwich attack pattern detected');
        });

        /**
         * Test Case 2: Time-bandit Attack Detection
         * 
         * This test simulates a time-bandit attack where a miner/validator attempts to 
         * reorganize blocks to extract value from a high-stake game.
         * 
         * Should trigger detection as this is a severe form of MEV extraction.
         */
        test('should detect time-bandit attack attempt', async () => {
            // Function signature for makeMove with a winning move after seeing opponent's move
            const makeMoveInput = '0x57a33a7c0000000000000000000000000000000000000000000000000000000000000001' + 
                              '0000000000000000000000000000000000000000000000000000000000000002'; // Choice.Paper
            
            const requestPayload = createBaseRequestPayload(
                player2Address,
                contractAddress,
                makeMoveInput
            );
            
            // Add blockchain context showing reorganization attempt
            requestPayload.additionalData = {
                blockchainContext: {
                    isReorg: true,
                    reorgDepth: 3, // 3 blocks deep reorg
                    targetedTransactions: [
                        {
                            hash: '0xd1c2b3a4f5e6d7c8b9a0f1e2d3c4b5a6',
                            from: player1Address,
                            to: contractAddress,
                            input: '0x57a33a7c0000000000000000000000000000000000000000000000000000000000000001' + 
                                  '0000000000000000000000000000000000000000000000000000000000000001', // Rock
                            gameId: 1,
                            stake: '5000000000000000000' // 5 ETH (high value game)
                        }
                    ],
                    validatorAddress: mevBotAddress,
                    potentialProfit: '1500000000000000000' // 1.5 ETH potential MEV extraction
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
            expect(body.message).toContain('Time-bandit attack detected');
        });

        /**
         * Test Case 3: JIT (Just-In-Time) Liquidity Attack
         * 
         * This test simulates a JIT liquidity attack where an attacker adds liquidity
         * just before a high-value game creation to capture fees and then removes liquidity.
         * 
         * Should trigger detection as this extracts value from players through temporary liquidity.
         */
        test('should detect JIT liquidity attack pattern', async () => {
            // Function signature for createGame with BestOfFive (high stake)
            const createGameInput = '0x25aa99cd0000000000000000000000000000000000000000000000000000000000000002';
            
            const requestPayload = createBaseRequestPayload(
                player1Address,
                contractAddress,
                createGameInput
            );
            
            // Add liquidity context showing JIT pattern
            requestPayload.additionalData = {
                liquidityContext: {
                    recentLiquidityEvents: [
                        {
                            type: 'add',
                            address: mevBotAddress,
                            amount: '100000000000000000000', // 100 ETH
                            timestamp: Date.now() - 5000, // 5 seconds before
                            pool: liquidityPoolAddress
                        },
                        {
                            type: 'playerTransaction',
                            address: player1Address,
                            amount: '10000000000000000000', // 10 ETH stake
                            timestamp: Date.now(),
                            fees: '100000000000000000' // 0.1 ETH in fees paid
                        },
                        {
                            type: 'remove',
                            address: mevBotAddress,
                            amount: '100200000000000000000', // 100.2 ETH (initial + fees)
                            timestamp: Date.now() + 5000, // 5 seconds after
                            pool: liquidityPoolAddress
                        }
                    ],
                    liquidityDuration: 10, // Only 10 seconds of liquidity provided
                    priceImpact: '1.2%'
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
            expect(body.message).toContain('JIT liquidity attack detected');
        });

        /**
         * Test Case 4: Multisig Validation Bypass Attack
         * 
         * This test simulates an attack where a transaction tries to bypass the multisig
         * validation by exploiting a timing issue when both players are submitting moves.
         * 
         * Should trigger detection as this could allow incorrect validation of game results.
         */
        test('should detect multisig validation bypass attempt', async () => {
            // Function signature for makeMove followed by _endGame in same transaction
            const complexAttackInput = '0x57a33a7c0000000000000000000000000000000000000000000000000000000000000001' + 
                                   '0000000000000000000000000000000000000000000000000000000000000002';
            
            const requestPayload = createBaseRequestPayload(
                player1Address,
                contractAddress,
                complexAttackInput
            );
            
            // Add call trace showing bypass attempt
            requestPayload.trace!.calls = [
                {
                    from: player1Address,
                    to: contractAddress,
                    input: complexAttackInput, // First make a move
                    output: '0x00',
                    gasUsed: '30000',
                    value: '0',
                },
                {
                    from: player1Address,
                    to: contractAddress,
                    // Attempt to directly call _endGame to bypass second player validation
                    input: '0x3e4372d00000000000000000000000000000000000000000000000000000000000000001',
                    output: '0x00',
                    gasUsed: '40000',
                    value: '0',
                }
            ];
            
            // Add multisig context
            requestPayload.additionalData = {
                multisigInfo: {
                    gameId: 1,
                    requiredPlayers: 2,
                    presentPlayers: 1, // Only one player has moved
                    authorizationState: {
                        player1Signature: true,
                        player2Signature: false
                    },
                    validationRules: [
                        "both_players_must_move_before_resolution",
                        "game_must_complete_required_rounds"
                    ]
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
            expect(body.message).toContain('Multisig validation bypass attempt detected');
        });

        /**
         * Test Case 5: Oracle Manipulation Attack
         * 
         * This test simulates an attack where an external oracle (used for random number
         * generation or price feed) is manipulated to influence game outcome.
         * 
         * Should trigger detection as this could allow extracting value by predicting outcomes.
         */
        test('should detect oracle manipulation attempt', async () => {
            // Function signature for makeMove with Oracle integration
            const oracleIntegratedMoveInput = '0x57a33a7c0000000000000000000000000000000000000000000000000000000000000001' + 
                                         '0000000000000000000000000000000000000000000000000000000000000003'; // Scissors
            
            const requestPayload = createBaseRequestPayload(
                player1Address,
                contractAddress,
                oracleIntegratedMoveInput
            );
            
            // Add oracle context showing price manipulation
            requestPayload.additionalData = {
                oracleContext: {
                    oracleAddress: '0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96666',
                    recentOracleUpdates: [
                        {
                            updateTx: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
                            updater: mevBotAddress,
                            oldValue: '10500000000', // Regular price
                            newValue: '9200000000',  // Manipulated price (-12.4%)
                            timestamp: Date.now() - 10000
                        },
                        {
                            updateTx: '0xc3d4e5f6a7b8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
                            updater: mevBotAddress,
                            oldValue: '9200000000',  // Manipulated price
                            newValue: '10600000000', // Price restored after attack (+15.2%)
                            timestamp: Date.now() + 60000
                        }
                    ],
                    volatilityAnalysis: {
                        normalVolatility: '1.2%',
                        attackVolatility: '12.4%',
                        confidenceScore: 0.96 // 96% confidence of manipulation
                    },
                    impactedGames: [
                        {
                            gameId: 5,
                            stake: '8000000000000000000', // 8 ETH
                            potentialProfit: '7500000000000000000' // 7.5 ETH through oracle manipulation
                        }
                    ]
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
            expect(body.message).toContain('Oracle manipulation attack detected');
        });

        /**
         * Test Case 6: Generalized Frontrunning Attack
         * 
         * This test simulates a generalized frontrunning attack where a bot copies a 
         * profitable transaction pattern but with higher gas price.
         * 
         * Should trigger detection as this extracts value meant for legitimate players.
         */
        test('should detect generalized frontrunning attack', async () => {
            // Function signature for strategic winning move in a high-stake game
            const strategicMoveInput = '0x57a33a7c0000000000000000000000000000000000000000000000000000000000000005' + 
                                   '0000000000000000000000000000000000000000000000000000000000000002'; // Paper in game #5
            
            const requestPayload = createBaseRequestPayload(
                mevBotAddress,
                contractAddress,
                strategicMoveInput
            );
            
            // Add mempool context showing frontrunning pattern
            requestPayload.additionalData = {
                mempoolContext: {
                    pendingTransactions: [
                        {
                            hash: '0xd1c2b3a4f5e6d7c8b9a0f1e2d3c4b5a6',
                            from: player2Address, // Original player
                            to: contractAddress,
                            input: strategicMoveInput, // Same exact move
                            gasPrice: '25000000000', // 25 Gwei
                            timestamp: Date.now() - 2000 // 2 seconds earlier
                        }
                    ],
                    currentTransaction: {
                        hash: requestPayload.hash,
                        from: mevBotAddress, // MEV bot copying the transaction
                        to: contractAddress,
                        input: strategicMoveInput, // Same exact move
                        gasPrice: '35000000000', // 35 Gwei (higher to ensure it mines first)
                        timestamp: Date.now()
                    },
                    similarityAnalysis: {
                        inputSimilarity: '100%', // Identical input data
                        methodSignature: '0x57a33a7c', // makeMove function
                        isExactCopy: true
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
            expect(body.message).toContain('Generalized frontrunning attack detected');
        });

        /**
         * Test Case 7: Regular Legitimate Game Transaction
         * 
         * This test simulates a normal game interaction without MEV or value extraction attempts.
         * 
         * Should NOT trigger detection as there's no attack pattern.
         */
        test('should not detect legitimate game transaction', async () => {
            // Normal function signature for joinGame(1)
            const joinGameInput = '0xee9a31a20000000000000000000000000000000000000000000000000000000000000001';
            
            const requestPayload = createBaseRequestPayload(
                player2Address,
                contractAddress,
                joinGameInput
            );
            
            // Add normal transaction context
            requestPayload.additionalData = {
                transactionContext: {
                    gasPricePercentile: 50, // Average gas price (50th percentile)
                    blockPosition: 45, // Middle of block
                    timeInMempool: 12, // 12 seconds in mempool (normal)
                    isContract: false, // Not a contract caller
                    isKnownPlayer: true // Known legitimate player address
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
            expect(body.detected).toBe(false); // Should not detect normal transaction
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
