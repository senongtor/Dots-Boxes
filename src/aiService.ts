module aiService {
  /** Returns the move that the computer player should do for the given state in move. */
  export function findComputerMove(move: IMove): IMove {
    return createComputerMove(move,
      // at most 1 second for the AI to choose a move (but might be much quicker)
      { millisecondsLimit: 1000 });
  }

  function getEdgeCount(i: number, j: number, state: IState): number {
    let count: number = 0;
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
  export function getPossibleMoves(state: IState, turnIndexBeforeMove: number): IMove[] {
    log.info(["State", state]);
    let possibleMoves: IMove[] = [];
    let rows: number = gameLogic.rows;
    let cols: number = gameLogic.cols;
    let visited: boolean[][] = [];
    for (let i = 0; i < rows; i++) {
      visited[i] = [];
      for (let j = 0; j < cols; j++) {
        visited[i][j] = false;
      }
    }

    let count1 = 0;
    let boxPos: number[][] = [];
    let count2 = 0;
    let boxWillBeOccupyByOpponent: number[][] = [];
    
    for (let i = 0; i < gameLogic.rows; i++) {
      for (let j = 0; j < gameLogic.cols; j++) {
        if (i % 2 != 0 && j % 2 != 0 && state.board[i][j].owner == -1) {
          //TODO
          //Need to take care of: Current grid is good but the adjacent grids has 2 surroudings already,
          //in this case, need to take a look at available edges instead of squares.
          if (getEdgeCount(i, j, state) == 2) {
            boxWillBeOccupyByOpponent[count2++] = [i, j];
          } else if (getEdgeCount(i, j, state) == 1 || getEdgeCount(i, j, state) == 0) {
            if ((i > 1 && getEdgeCount(i - 2, j, state) == 2) ||
              (i < rows - 2 && getEdgeCount(i + 2, j, state) == 2) ||
              (j > 1 && getEdgeCount(i, j - 2, state) == 2) ||
              (j < cols - 2 && getEdgeCount(i, j + 2, state) == 2)) {
              boxWillBeOccupyByOpponent[count2++] = [i, j];
            } else {
              boxPos[count1++] = [i, j];
            }
          } else if (getEdgeCount(i, j, state) == 3) {
            boxPos[count1++] = [i, j];
          }
        }
      }
    }
    log.info(["boxPos", boxPos, "OppenPos", boxWillBeOccupyByOpponent]);
    if (boxPos.length == 0) {
      for (let k = 0; k < boxWillBeOccupyByOpponent.length; k++) {
        let kx = boxWillBeOccupyByOpponent[k][0];
        let ky = boxWillBeOccupyByOpponent[k][1];
        for (let d = -1; d <= 1; d++) {
          for (let dd = -1; dd <= 1; dd++) {
            if (Math.abs(dd - d) == 1) {
              try {
                possibleMoves.push(gameLogic.createMove(state, kx + d, ky + dd, turnIndexBeforeMove));
              } catch (e) {
                // The cell in that position was full.
              }
            }
          }
        }
      }
      return possibleMoves;
    }

    boxPos.sort((n1, n2) => {
      let c1 = getEdgeCount(n1[0], n1[1], state);
      let c2 = getEdgeCount(n2[0], n2[1], state);
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
    for (let k = 0; k < boxPos.length; k++) {
      let kx = boxPos[k][0];
      let ky = boxPos[k][1];
      for (let d = -1; d <= 1; d++) {
        for (let dd = -1; dd <= 1; dd++) {
          if (Math.abs(dd - d) == 1) {
            try {
              possibleMoves.push(gameLogic.createMove(state, kx + d, ky + dd, turnIndexBeforeMove));
            } catch (e) {
              // The cell in that position was full.
            }
          }
        }
      }
    }

    return possibleMoves;
  }

  /**
   * Returns the move that the computer player should do for the given state.
   * alphaBetaLimits is an object that sets a limit on the alpha-beta search,
   * and it has either a millisecondsLimit or maxDepth field:
   * millisecondsLimit is a time limit, and maxDepth is a depth limit.
   */
  export function createComputerMove(
    move: IMove, alphaBetaLimits: IAlphaBetaLimits): IMove {
    // We use alpha-beta search, where the search states are TicTacToe moves.
    return alphaBetaService.alphaBetaDecision(
      move, move.turnIndex, getNextStates, getStateScoreForIndex0, null, alphaBetaLimits);
  }

  function getStateScoreForIndex0(move: IMove, playerIndex: number): number {
    let endMatchScores = move.endMatchScores;
    if (endMatchScores) {
      return endMatchScores[0] > endMatchScores[1] ? Number.POSITIVE_INFINITY
        : endMatchScores[0] < endMatchScores[1] ? Number.NEGATIVE_INFINITY
          : 0;
    }
    return 0;
  }

  function getNextStates(move: IMove, playerIndex: number): IMove[] {
    return getPossibleMoves(move.state, playerIndex);
  }
}
