// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract RockPaperScissors is ReentrancyGuard, Ownable {
    using Address for address payable;

    uint256 public creatorFee = 25;
    uint256 private nextGameId = 1;

    enum Choice { None, Rock, Paper, Scissors }
    enum GameType { OneRound, BestOfThree, BestOfFive }

    struct Game {
        uint256 gameId;
        address[2] players;
        uint256 stake;
        GameType gameType;
        uint8 roundsPlayed;
        uint8[2] scores;
        Choice[2] choices;
        bool isActive;
        address lastPlayerMove;
        Choice[] player1Moves; 
        Choice[] player2Moves;
    }

    struct GameView {
        uint256 gameId;
        address[2] players;
        uint256 stake;
        uint8 gameType;      
        uint8 roundsPlayed;
        uint8[2] scores;
        uint8[2] choices;
        bool isActive;
        address lastPlayerMove;
        Choice[] player1Moves;
        Choice[] player2Moves;
    }

    mapping(uint256 => Game) public games;
    mapping(address => uint256[]) public userGames;

    event GameCreated(uint256 indexed gameId, address player1, uint256 stake, GameType gameType);
    event GameJoined(uint256 indexed gameId, address player2);
    event RoundPlayed(uint256 indexed gameId, uint8 roundNumber, Choice player1Choice, Choice player2Choice);
    event GameEnded(uint256 indexed gameId, address winner, uint256 payout);
    event PlayerMoved(uint256 indexed gameId, address player, Choice choice);

    constructor() Ownable(msg.sender) {
        transferOwnership(msg.sender);
    }

    function createGame(GameType _gameType) external payable returns (uint256) {
        require(msg.value > 0, "Stake must be greater than 0");

        uint256 gameId = nextGameId++;
        games[gameId] = Game({
            gameId: gameId,
            players: [msg.sender, address(0)],
            stake: msg.value,
            gameType: _gameType,
            roundsPlayed: 0,
            scores: [0, 0],
            choices: [Choice.None, Choice.None],
            isActive: true,
            lastPlayerMove: address(0),
            player1Moves: new Choice[](0) ,
            player2Moves: new Choice[](0) 
        });

        userGames[msg.sender].push(gameId);

        emit GameCreated(gameId, msg.sender, msg.value, _gameType);
        return gameId;
    }

    function joinGame(uint256 _gameId) external payable {
        Game storage game = games[_gameId];
        require(game.isActive, "Game is not active");
        require(game.players[1] == address(0), "Game is full");
        require(game.players[0] != msg.sender, "Already in game");
        require(msg.value == game.stake, "Incorrect stake amount");

        game.players[1] = msg.sender;
        userGames[msg.sender].push(_gameId);
        emit GameJoined(_gameId, msg.sender);
    }

    function makeMove(uint256 _gameId, Choice _choice) external {
        Game storage game = games[_gameId];
        require(game.isActive, "Game is not active");
        require(_choice == Choice.Rock || _choice == Choice.Paper || _choice == Choice.Scissors, "Invalid choice");
        require(game.lastPlayerMove != msg.sender, "Cannot make two moves in a row");

        uint8 playerIndex = game.players[0] == msg.sender ? 0 : 1;
        require(game.players[playerIndex] == msg.sender, "Not a player in this game");
        require(game.choices[playerIndex] == Choice.None, "Choice already made");

        game.choices[playerIndex] = _choice;
        game.lastPlayerMove = msg.sender;

        if (playerIndex == 0) {
            game.player1Moves.push(_choice);
        } else {
            game.player2Moves.push(_choice);
        }

        emit PlayerMoved(_gameId, msg.sender, _choice);

        if (game.choices[0] != Choice.None && game.choices[1] != Choice.None) {
            _resolveRound(_gameId);
        }
    }

    function _resolveRound(uint256 _gameId) private {
        Game storage game = games[_gameId];
        Choice player1Choice = game.choices[0];
        Choice player2Choice = game.choices[1];

        emit RoundPlayed(_gameId, game.roundsPlayed + 1, player1Choice, player2Choice);

        if (player1Choice == player2Choice) {
            // Tie, no points awarded
        } else if (
            (player1Choice == Choice.Rock && player2Choice == Choice.Scissors) ||
            (player1Choice == Choice.Paper && player2Choice == Choice.Rock) ||
            (player1Choice == Choice.Scissors && player2Choice == Choice.Paper)
        ) {
            game.scores[0]++;  // Player 1 wins the round
        } else {
            game.scores[1]++;  // Player 2 wins the round
        }

        game.roundsPlayed++;
        game.choices = [Choice.None, Choice.None];  // Reset choices for next round
        game.lastPlayerMove = address(0);

        if (_isGameOver(game)) {
            _endGame(_gameId);
        }
    }

function getGameById(uint256 _id) public view returns (Game memory){
        return games[_id];
    }


    function getUserGames(address _user) external view returns (uint256[] memory) {
        return userGames[_user];
    }


    function getGamesInfo(uint256[] calldata gameIds) external view returns (GameView[] memory) {
        GameView[] memory gameViews = new GameView[](gameIds.length);

        for (uint256 i = 0; i < gameIds.length; i++) {
            Game storage game = games[gameIds[i]];

            // Convert enum arrays to uint8 arrays for external visibility
            uint8[2] memory choicesArray;
            choicesArray[0] = uint8(game.choices[0]);
            choicesArray[1] = uint8(game.choices[1]);

            gameViews[i] = GameView({
                gameId: gameIds[i],
                players: game.players,
                stake: game.stake,
                gameType: uint8(game.gameType),
                roundsPlayed: game.roundsPlayed,
                scores: game.scores,
                choices: choicesArray,
                isActive: game.isActive,
                lastPlayerMove: game.lastPlayerMove,
                player1Moves: game.player1Moves,
                player2Moves: game.player2Moves 
            });
        }

        return gameViews;
    }

    function getPlayerMoves(uint256 _gameId, address player) external view returns (Choice[] memory) {
        Game storage game = games[_gameId];
        require(game.players[0] == player || game.players[1] == player, "Player not in this game");

        if (game.players[0] == player) {
            return game.player1Moves;
        } else {
            return game.player2Moves;
        }
    }

    function _isGameOver(Game storage game) private view returns (bool) {
        if (game.gameType == GameType.OneRound) {
            return game.roundsPlayed == 1;
        } else if (game.gameType == GameType.BestOfThree) {
            return game.scores[0] == 2 || game.scores[1] == 2;
        } else {  // BestOfFive
            return game.scores[0] == 3 || game.scores[1] == 3;
        }
    }

    function _endGame(uint256 _gameId) private nonReentrant {
        Game storage game = games[_gameId];
        address winner;
        uint256 payout;

        if (game.scores[0] > game.scores[1]) {
            winner = game.players[0];
        } else if (game.scores[1] > game.scores[0]) {
            winner = game.players[1];
        } else {
            // Tie, return stakes to both players
            payable(game.players[0]).sendValue(game.stake);
            payable(game.players[1]).sendValue(game.stake);
            game.isActive = false;
            emit GameEnded(_gameId, address(0), 0);
            return;
        }

        payout = (game.stake * 2 * (10000 - creatorFee)) / 10000;
        uint256 fee = (game.stake * 2) - payout;
        payable(winner).sendValue(payout);
        payable(owner()).sendValue(fee);

        game.isActive = false;
        emit GameEnded(_gameId, winner, payout);
    }
}