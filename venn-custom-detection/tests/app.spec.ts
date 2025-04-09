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

    describe('RockPaperScissors Detection Tests', () => {
        // Base request payload for testing
        const createBaseRequestPayload = (from: string, to: string, input: string): Partial<DetectionRequest> => ({
            id: 'rps-detection-test',
            detectorName: 'rps-multisig-detector',
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
         * Test Case 1: Normal Game Creation
         * 
         * This test verifies a legitimate game creation by player1
         * Should NOT trigger detection
         */
        test('should not detect legitimate game creation', async () => {
            // Function signature for createGame(GameType.OneRound)
            const createGameInput = '0x25aa99cd0000000000000000000000000000000000000000000000000000000000000000';
            
            const requestPayload = createBaseRequestPayload(
                player1Address, 
                contractAddress,
                createGameInput
            );

            // Act
            const response = await request(app)
                .post('/detect')
                .send(requestPayload)
                .set('Content-Type', 'application/json');

            const body: DetectionResponse = response.body;

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK);
            expect(body.protocolName).toBe(requestPayload.protocolName);
            expect(body.protocolAddress).toBe(requestPayload.protocolAddress);
            expect(body.detected).toBe(false); // Should not detect normal game creation
        });

        /**
         * Test Case 2: Normal Game Join
         * 
         * This test verifies a legitimate game join by player2
         * Should NOT trigger detection
         */
        test('should not detect legitimate game join', async () => {
            // Function signature for joinGame(1)
            const joinGameInput = '0xee9a31a20000000000000000000000000000000000000000000000000000000000000001';
            
            const requestPayload = createBaseRequestPayload(
                player2Address, 
                contractAddress,
                joinGameInput
            );

            // Act
            const response = await request(app)
                .post('/detect')
                .send(requestPayload)
                .set('Content-Type', 'application/json');

            const body: DetectionResponse = response.body;

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK);
            expect(body.detected).toBe(false); // Should not detect normal game join
        });

        /**
         * Test Case 3: Rapid Sequential Moves from Same Player
         * 
         * This test simulates an abnormal pattern where the same player 
         * tries to make multiple moves in quick succession
         * Should trigger detection
         */
        test('should detect rapid sequential moves from same player', async () => {
            // Function signature for makeMove(1, Choice.Rock)
            const makeMoveInput = '0x57a33a7c0000000000000000000000000000000000000000000000000000000000000001' + 
                              '0000000000000000000000000000000000000000000000000000000000000001'; // Choice.Rock
            
            // Create trace with multiple calls from same address in rapid succession
            const requestPayload = createBaseRequestPayload(
                player1Address, 
                contractAddress,
                makeMoveInput
            );
            
            // Add nested calls to simulate rapid successive moves
            // This represents a suspicious behavior pattern
            requestPayload.trace!.calls = [
                {
                    from: player1Address,
                    to: contractAddress,
                    input: makeMoveInput,
                    output: '0x0',
                    gasUsed: '25000',
                    value: '0',
                },
                {
                    from: player1Address,
                    to: contractAddress,
                    input: makeMoveInput,
                    output: '0x0',
                    gasUsed: '25000',
                    value: '0',
                }
            ];

            // Act
            const response = await request(app)
                .post('/detect')
                .send(requestPayload)
                .set('Content-Type', 'application/json');

            const body: DetectionResponse = response.body;

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK);
            expect(body.detected).toBe(true); // Should detect abnormal behavior
            expect(body.message).toContain('Suspicious rapid sequential moves detected');
        });

        /**
         * Test Case 4: Unauthorized Player Attempting to Make a Move
         * 
         * This test simulates an unauthorized player (not player1 or player2)
         * trying to make a move in a game
         * Should trigger detection
         */
        test('should detect unauthorized player move', async () => {
            // Function signature for makeMove(1, Choice.Paper)
            const makeMoveInput = '0x57a33a7c0000000000000000000000000000000000000000000000000000000000000001' + 
                              '0000000000000000000000000000000000000000000000000000000000000002'; // Choice.Paper
            
            const requestPayload = createBaseRequestPayload(
                maliciousAddress, // Unauthorized address 
                contractAddress,
                makeMoveInput
            );
            
            // Add game state data to additionalData
            requestPayload.additionalData = {
                gameState: {
                    gameId: 1,
                    players: [player1Address, player2Address],
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
            expect(body.detected).toBe(true); // Should detect unauthorized player
            expect(body.message).toContain('Unauthorized player attempting to make move');
        });

        /**
         * Test Case 5: Attempt to End Game Prematurely
         * 
         * This test simulates an attempt to end a game before it's properly finished
         * Should trigger detection
         */
        test('should detect attempt to end game prematurely', async () => {
            // Create a custom input that could be attempting to call _endGame directly
            // This is a private function, but we're simulating a malicious call attempt
            const endGameInput = '0x3e4372d00000000000000000000000000000000000000000000000000000000000000001';
            
            const requestPayload = createBaseRequestPayload(
                player1Address,
                contractAddress,
                endGameInput
            );
            
            // Add game state data to additionalData to show game is not over
            requestPayload.additionalData = {
                gameState: {
                    gameId: 1,
                    players: [player1Address, player2Address],
                    roundsPlayed: 0,
                    scores: [0, 0],
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
            expect(body.detected).toBe(true); // Should detect premature game ending attempt
            expect(body.message).toContain('Attempt to end game prematurely detected');
        });

        /**
         * Test Case 6: Frontrunning Detection
         * 
         * This test simulates a frontrunning attack where an attacker watches the mempool
         * for a player's move and tries to frontrun it with their own move
         * Should trigger detection
         */
        test('should detect potential frontrunning attack', async () => {
            // Function signature for makeMove(1, Choice.Scissors)
            const makeMoveInput = '0x57a33a7c0000000000000000000000000000000000000000000000000000000000000001' + 
                              '0000000000000000000000000000000000000000000000000000000000000003'; // Choice.Scissors
            
            const requestPayload = createBaseRequestPayload(
                player2Address,
                contractAddress,
                makeMoveInput
            );

            // Add nested calls to simulate frontrunning pattern
            requestPayload.trace!.calls = [
                {
                    from: player2Address,
                    to: contractAddress,
                    input: makeMoveInput,
                    gasUsed: '21000',
                    value: '0',
                }
            ];
            
            // Add timing and gas price information that suggests frontrunning
            requestPayload.additionalData = {
                gasPrice: '50000000000', // Very high gas price (50 Gwei)
                pendingTransactions: [
                    {
                        from: player1Address,
                        to: contractAddress,
                        input: '0x57a33a7c0000000000000000000000000000000000000000000000000000000000000001' +
                               '0000000000000000000000000000000000000000000000000000000000000001', // player1 making Rock move
                        gasPrice: '20000000000' // 20 Gwei (lower than attacker)
                    }
                ],
                timingData: {
                    submissionTimeDelta: 0.5 // Submitted 0.5 seconds after seeing player1's transaction
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
            expect(body.detected).toBe(true); // Should detect frontrunning
            expect(body.message).toContain('Potential frontrunning attack detected');
        });

        /**
         * Test Case 7: Unusual Stake Pattern
         * 
         * This test simulates a player creating multiple games with unusual stake patterns
         * that might indicate automated exploitation attempts
         * Should trigger detection
         */
        test('should detect unusual stake patterns', async () => {
            // Function signature for createGame with BestOfFive
            const createGameInput = '0x25aa99cd0000000000000000000000000000000000000000000000000000000000000002';
            
            const requestPayload = createBaseRequestPayload(
                player1Address,
                contractAddress,
                createGameInput
            );
            
            // Add data to show a pattern of many small-stake games being created
            requestPayload.additionalData = {
                gameCreationHistory: [
                    { gameId: 120, stake: '100000000000000', timestamp: Date.now() - 30000 },
                    { gameId: 121, stake: '100000000000000', timestamp: Date.now() - 25000 },
                    { gameId: 122, stake: '100000000000000', timestamp: Date.now() - 20000 },
                    { gameId: 123, stake: '100000000000000', timestamp: Date.now() - 15000 },
                    { gameId: 124, stake: '100000000000000', timestamp: Date.now() - 10000 },
                    { gameId: 125, stake: '100000000000000', timestamp: Date.now() - 5000 }
                ],
                suspiciousPattern: 'rapid small-stake game creation'
            };

            // Act
            const response = await request(app)
                .post('/detect')
                .send(requestPayload)
                .set('Content-Type', 'application/json');

            const body: DetectionResponse = response.body;

            // Assert
            expect(response.status).toBe(HTTP_STATUS_CODES.OK);
            expect(body.detected).toBe(true); // Should detect unusual pattern
            expect(body.message).toContain('Unusual stake pattern detected');
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
