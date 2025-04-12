# Rock-Paper-Scissors Game with Venn Firewall Protection

contract deployed liink : https://holesky.etherscan.io/address/0x7296c77Edd04092Fd6a8117c7f797E0680d97fa1

A decentralized Rock-Paper-Scissors game built on the Venn Holesky testnet. This application allows users to create and join games, make strategic moves, and compete for ETH stakes, all while being protected by Venn's firewall security.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Game Rules](#game-rules)
- [Security Features](#security-features)
- [Network Information](#network-information)

## Overview

This Rock-Paper-Scissors dApp demonstrates how traditional games can be securely implemented on the blockchain with protection against common attack vectors like MEV and value extraction attacks. Players can create games with different stakes and rule sets, join existing games, and compete for ETH rewards.

## Features

- **Multiple Game Types**: Play One Round, Best of Three, or Best of Five matches
- **ETH Stakes**: Bet with real ETH on game outcomes
- **Game History**: Track your past games and move history
- **Secure Gameplay**: Protected by Venn's firewall against common blockchain attacks
- **Transparent Outcomes**: All game results are determined by smart contract logic visible on-chain

## Technology Stack

- **Frontend**: Next.js, React, Rainbow Kit, Wagmi
- **Smart Contracts**: Solidity 0.8.26 with OpenZeppelin libraries
- **Security**: Venn Firewall protection against MEV attacks
- **Networks**: Venn Holesky testnet (Chain ID: 17000)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/shiful.git
   cd shiful
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to http://localhost:3000

5. Connect your wallet to the Venn Holesky testnet (Chain ID: 17000)

## Game Rules

1. **Creating a Game**: 
   - Choose a game type (One Round, Best of Three, Best of Five)
   - Set your ETH stake amount
   - Create the game and wait for an opponent

2. **Joining a Game**:
   - Browse available games
   - Match the stake amount
   - Join the game

3. **Gameplay**:
   - Choose Rock, Paper, or Scissors for each round
   - The winner is determined by standard rock-paper-scissors rules:
     - Rock beats Scissors
     - Scissors beats Paper
     - Paper beats Rock
   - In case of a tie, no points are awarded

4. **Winning Conditions**:
   - One Round: Winner takes all after a single round
   - Best of Three: First to win 2 rounds
   - Best of Five: First to win 3 rounds

5. **Rewards**:
   - Winner receives both stakes minus a small creator fee
   - In case of a tie, both players receive their stakes back

## Security Features

This game integrates Venn's Firewall protection system to guard against:

- Sandwich attacks targeting high-stake games
- Time-bandit attacks through chain reorganization
- JIT liquidity attacks
- Attempts to bypass validation
- Oracle manipulation affecting game outcomes
- Generalized frontrunning attacks

## Network Information

- **Network**: Venn Holesky Testnet
- **Chain ID**: 17000
- **RPC URL**: https://ethereum-holesky.publicnode.com
- **Explorer**: https://holesky.etherscan.io



