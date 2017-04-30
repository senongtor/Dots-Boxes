var aiService;
(function (aiService) {
    /** Returns the move that the computer player should do for the given state in move. */
    function findComputerMove(move) {
        return createComputerMove(move, 
        // at most 1 second for the AI to choose a move (but might be much quicker)
        { millisecondsLimit: 1000 });
    }
    aiService.findComputerMove = findComputerMove;
    function getEdgeCount(i, j, state) {
        var count = 0;
        if (state.board[i - 1][j].owner != -1) {
            count++;
        }
        if (state.board[i + 1][j].owner != -1) {
            count++;
        }
        if (state.board[i][j - 1].owner != -1) {
            count++;
        }
        if (state.board[i][j + 1].owner != -1) {
            count++;
        }
        return count;
    }
    /**
     * Returns all the possible moves for the given state and turnIndexBeforeMove.
     * Returns an empty array if the game is over.
     */
    function getPossibleMoves(state, turnIndexBeforeMove) {
        //log.info(["State", state]);
        var possibleMoves = [];
        var rows = gameLogic.rows;
        var cols = gameLogic.cols;
        var count1 = 0;
        var boxPos = [];
        var count2 = 0;
        var boxWillBeOccupyByOpponent = [];
        for (var i = 0; i < gameLogic.rows; i++) {
            for (var j = 0; j < gameLogic.cols; j++) {
                if (i % 2 != 0 && j % 2 != 0 && state.board[i][j].owner == -1) {
                    //TODO
                    //Need to take care of: Current grid is good but the adjacent grids has 2 surroudings already,
                    //in this case, need to take a look at available edges instead of squares.
                    var edgeCount = getEdgeCount(i, j, state);
                    if (edgeCount == 2) {
                        boxWillBeOccupyByOpponent[count2++] = [i, j];
                    }
                    else if (edgeCount == 1 || edgeCount == 0) {
                        if ((i > 1 && getEdgeCount(i - 2, j, state) == 2 && state.board[i - 1][j].owner == -1) ||
                            (i < rows - 2 && getEdgeCount(i + 2, j, state) == 2 && state.board[i + 1][j].owner == -1) ||
                            (j > 1 && getEdgeCount(i, j - 2, state) == 2 && state.board[i][j - 1].owner == -1) ||
                            (j < cols - 2 && getEdgeCount(i, j + 2, state) == 2 && state.board[i + 1][j].owner == -1)) {
                            boxWillBeOccupyByOpponent[count2++] = [i, j];
                        }
                        else {
                            boxPos[count1++] = [i, j];
                        }
                    }
                    else if (edgeCount == 3) {
                        boxPos[count1++] = [i, j];
                    }
                }
            }
        }
        //log.info(["boxPos", boxPos, "OppenPos", boxWillBeOccupyByOpponent]);
        if (boxPos.length == 0) {
            for (var k = 0; k < boxWillBeOccupyByOpponent.length; k++) {
                var kx = boxWillBeOccupyByOpponent[k][0];
                var ky = boxWillBeOccupyByOpponent[k][1];
                for (var d = -1; d <= 1; d++) {
                    for (var dd = -1; dd <= 1; dd++) {
                        if (Math.abs(dd - d) == 1) {
                            try {
                                possibleMoves.push(gameLogic.createMove(state, kx + d, ky + dd, turnIndexBeforeMove));
                            }
                            catch (e) {
                                // The cell in that position was full.
                            }
                        }
                    }
                }
            }
            return possibleMoves;
        }
        boxPos.sort(function (n1, n2) {
            var c1 = getEdgeCount(n1[0], n1[1], state);
            var c2 = getEdgeCount(n2[0], n2[1], state);
            if (c1 < c2) {
                return 1;
            }
            if (c1 > c2) {
                return -1;
            }
            return 0;
        });
        //If we have to make a move that will impair our situation
        //If we can find any move that won't let the opponent be in a good situation
        for (var k = 0; k < boxPos.length; k++) {
            var kx = boxPos[k][0];
            var ky = boxPos[k][1];
            for (var d = -1; d <= 1; d++) {
                for (var dd = -1; dd <= 1; dd++) {
                    if (Math.abs(dd - d) == 1) {
                        try {
                            possibleMoves.push(gameLogic.createMove(state, kx + d, ky + dd, turnIndexBeforeMove));
                        }
                        catch (e) {
                            // The cell in that position was full.
                        }
                    }
                }
            }
        }
        return possibleMoves;
    }
    aiService.getPossibleMoves = getPossibleMoves;
    /**
     * Returns the move that the computer player should do for the given state.
     * alphaBetaLimits is an object that sets a limit on the alpha-beta search,
     * and it has either a millisecondsLimit or maxDepth field:
     * millisecondsLimit is a time limit, and maxDepth is a depth limit.
     */
    function createComputerMove(move, alphaBetaLimits) {
        // We use alpha-beta search, where the search states are TicTacToe moves.
        return alphaBetaService.alphaBetaDecision(move, move.turnIndex, getNextStates, getStateScoreForIndex0, null, alphaBetaLimits);
    }
    aiService.createComputerMove = createComputerMove;
    function getStateScoreForIndex0(move, playerIndex) {
        var endMatchScores = move.endMatchScores;
        if (endMatchScores) {
            return endMatchScores[0] > endMatchScores[1] ? Number.POSITIVE_INFINITY
                : endMatchScores[0] < endMatchScores[1] ? Number.NEGATIVE_INFINITY
                    : 0;
        }
        return 0;
    }
    function getNextStates(move, playerIndex) {
        return getPossibleMoves(move.state, playerIndex);
    }
})(aiService || (aiService = {}));
//# sourceMappingURL=aiService.js.map