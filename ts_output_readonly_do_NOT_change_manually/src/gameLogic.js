/**
 * 4 Direction for each grid
 */
var Direction;
(function (Direction) {
    Direction[Direction["Hor"] = 1] = "Hor";
    Direction[Direction["Ver"] = 2] = "Ver";
})(Direction || (Direction = {}));
var Shape;
(function (Shape) {
    Shape[Shape["Dot"] = 1] = "Dot";
    Shape[Shape["Box"] = 2] = "Box";
    Shape[Shape["Line"] = 3] = "Line";
})(Shape || (Shape = {}));
var Occupied;
(function (Occupied) {
    Occupied[Occupied["Up"] = 1] = "Up";
    Occupied[Occupied["Down"] = 2] = "Down";
    Occupied[Occupied["Left"] = 3] = "Left";
    Occupied[Occupied["Right"] = 4] = "Right";
})(Occupied || (Occupied = {}));
/**
 * Grid that will model the region
 */
var Grid = (function () {
    function Grid() {
        this.owner = -1;
        this.isBomb = false;
    }
    return Grid;
}());
var gameService = gamingPlatform.gameService;
var alphaBetaService = gamingPlatform.alphaBetaService;
var translate = gamingPlatform.translate;
var resizeGameAreaService = gamingPlatform.resizeGameAreaService;
var log = gamingPlatform.log;
var dragAndDropService = gamingPlatform.dragAndDropService;
var gameLogic;
(function (gameLogic) {
    function createNewBoard(row, col) {
        gameLogic.rows = row;
        gameLogic.cols = col;
        var board = [];
        for (var i = 0; i < row; i++) {
            board[i] = [];
            for (var j = 0; j < col; j++) {
                board[i][j] = new Grid();
                //[][     ][][      ][]
                if (i % 2 == 0) {
                    if (j % 2 == 0) {
                        board[i][j].shape = Shape.Dot;
                    }
                    else {
                        board[i][j].shape = Shape.Line;
                        board[i][j].dir = Direction.Hor;
                    }
                    //|[BOX]|[BOX ]                    
                }
                else {
                    if (j % 2 == 0) {
                        board[i][j].shape = Shape.Line;
                        board[i][j].dir = Direction.Ver;
                    }
                    else {
                        board[i][j].shape = Shape.Box;
                    }
                }
            }
        }
        return board;
    }
    function getInitialBoardWP(row, col) {
        return createNewBoard(row, col);
    }
    gameLogic.getInitialBoardWP = getInitialBoardWP;
    //   export function getInitialBoard(): Board {
    //     return createNewBoard();
    //   }
    function getInitialStateWP(row, col) {
        return { board: getInitialBoardWP(row, col), delta: null };
    }
    gameLogic.getInitialStateWP = getInitialStateWP;
    //   export function getInitialState(): IState {
    //     return {board: getInitialBoard(), delta: null};
    //   }
    /**
     * Create Move
     */
    function createMove(stateBeforeMove, row, col, turnIndexBeforeMove) {
        if (!stateBeforeMove) {
            stateBeforeMove = getInitialStateWP(15, 15);
        }
        var board = stateBeforeMove.board;
        var dim = board.length;
        if (isOver(board)) {
            throw new Error("Can only make a move if the game is not over!");
        }
        //If the shape of this grid is not line, return
        if (board[row][col].shape == Shape.Dot) {
            throw new Error("Cannot put it here man");
        }
        //If the user touches a bomb
        if (stateBeforeMove.board[row][col].shape == Shape.Box) {
            if (stateBeforeMove.board[row][col].isBomb) {
                return throwAtomicBomb(stateBeforeMove, row, col, turnIndexBeforeMove);
            }
            else {
                throw new Error("Cannot put it here man");
            }
        }
        if (board[row][col].owner >= 0) {
            throw new Error("No further move can be created because this line is already occupied");
        }
        var boardAfterMove = angular.copy(board);
        var turnIndex;
        //Now this edge was owned, turn it to currentplayer index.
        boardAfterMove[row][col].owner = turnIndexBeforeMove;
        //assign the current move player as the owner of that edge
        //If the edge is horizontal, check up and down box
        //If the edge is vertical, check left and right box
        //If any adjcent box has all edges taken, assign the current player as the owner of that box    
        if (boardAfterMove[row][col].dir == Direction.Hor) {
            var streak = false;
            if (row > 0) {
                if (boxOccupied(boardAfterMove, row - 1, col)) {
                    boardAfterMove[row - 1][col].owner = turnIndexBeforeMove;
                    turnIndex = turnIndexBeforeMove;
                    streak = true;
                }
            }
            if (row < dim - 1) {
                if (boxOccupied(boardAfterMove, row + 1, col)) {
                    boardAfterMove[row + 1][col].owner = turnIndexBeforeMove;
                    turnIndex = turnIndexBeforeMove;
                    streak = true;
                }
            }
            if (!streak) {
                turnIndex = turnIndexBeforeMove ^ 1;
            }
            //For the vertical line placed for current player   
        }
        else if (boardAfterMove[row][col].dir == Direction.Ver) {
            var streak = false;
            //If the line has left box.
            if (col > 0) {
                if (boxOccupied(boardAfterMove, row, col - 1)) {
                    boardAfterMove[row][col - 1].owner = turnIndexBeforeMove;
                    turnIndex = turnIndexBeforeMove;
                    streak = true;
                }
            }
            //If the line has right box.
            if (col < dim - 1) {
                if (boxOccupied(boardAfterMove, row, col + 1)) {
                    boardAfterMove[row][col + 1].owner = turnIndexBeforeMove;
                    turnIndex = turnIndexBeforeMove;
                    streak = true;
                }
            }
            if (!streak) {
                turnIndex = turnIndexBeforeMove ^ 1;
            }
        }
        // log.info(["board after step on position", row, ",", col, ":", boardAfterMove]);
        var endMatchScores;
        if (isOver(boardAfterMove)) {
            log.info("IS OVER!");
            turnIndex = -1;
            if (getWinner(boardAfterMove) == -1) {
                endMatchScores = [0, 0];
            }
            if (getWinner(boardAfterMove) == 1) {
                endMatchScores = [0, 1];
            }
            if (getWinner(boardAfterMove) == 0) {
                endMatchScores = [1, 0];
            }
        }
        else {
            endMatchScores = null;
        }
        var delta = { row: row, col: col };
        var state = { board: boardAfterMove, delta: delta };
        return { endMatchScores: endMatchScores, turnIndex: turnIndex, state: state };
    }
    gameLogic.createMove = createMove;
    /**
     * Check if the box is surrounded
     */
    function boxOccupied(board, row, col) {
        // log.info(["board:",board,row,col]);
        return board[row - 1][col].owner >= 0 &&
            board[row + 1][col].owner >= 0 &&
            board[row][col - 1].owner >= 0 &&
            board[row][col + 1].owner >= 0;
    }
    /**
     * Find out who wins
     */
    function getWinner(board) {
        var count = [0, 0];
        var dim = board.length;
        for (var i = 0; i < dim; i++) {
            for (var j = 0; j < dim; j++) {
                if (board[i][j].shape == Shape.Box) {
                    count[board[i][j].owner]++;
                }
            }
        }
        if (count[0] > count[1]) {
            return 0;
        }
        if (count[1] > count[0]) {
            return 1;
        }
        //Ties
        return -1;
    }
    /**
     * Check for game termination
     */
    function isOver(board) {
        var dim = board.length;
        for (var i = 0; i < dim; i++) {
            for (var j = 0; j < dim; j++) {
                if (board[i][j].shape != Shape.Box) {
                    continue;
                }
                if (board[i][j].owner == -1) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * At each turn, has a possibility of 100/row that it will show up randomly in a place.
     * Once it is clicked, the edges/lines around it will be destroyed
     * And all the adjcent already occupied squares will reset also.
     * @param row
     * @param col
     */
    function throwAtomicBomb(stateBeforeMove, r, c, turnIndexBeforeMove) {
        var board = stateBeforeMove.board;
        var dim = board.length;
        // let l: { [id: number]: BoardDelta } = {};
        // let idx = 0;
        // for (let i = 0; i < dim; i++) {
        //     for (let j = 0; j < dim; j++) {
        //         if (board[i][j].shape != Shape.Line) {
        //             continue;
        //         }
        //         if (board[i][j].owner == -1) {
        //             continue;
        //         }
        //         l[idx++] = { row: i, col: j };
        //     }
        // }
        // let rand = Math.floor(Math.random() * (idx - 1));
        // let r = l[rand].row;
        // let c = l[rand].col;
        // //Reset the ownership of the line
        var boardAfterMove = angular.copy(board);
        // boardAfterMove[r][c].owner = -1;
        // //Reset the ownership of two regions adjacent to the line
        // if (boardAfterMove[r][c].dir == Direction.Hor) {
        //     if (r > 0) {
        //         boardAfterMove[r - 1][c].owner = -1
        //     }
        //     if (r < dim - 1) {
        //         boardAfterMove[r + 1][c].owner = -1
        //     }
        // } else {
        //     if (c > 0) {
        //         boardAfterMove[r][c - 1].owner = -1
        //     }
        //     if (c < dim - 1) {
        //         boardAfterMove[r][c + 1].owner = -1
        //     }
        // }
        var boxes = {};
        //Unset all 4 lines surrounding
        boardAfterMove[r - 1][c].owner = -1;
        boardAfterMove[r + 1][c].owner = -1;
        boardAfterMove[r][c + 1].owner = -1;
        boardAfterMove[r][c - 1].owner = -1;
        boxes[0] = { row: r - 2, col: c };
        boxes[1] = { row: r + 2, col: c };
        boxes[2] = { row: r, col: c + 2 };
        boxes[3] = { row: r, col: c - 2 };
        // log.info(["Unset the square at", r, c]);
        // log.info(["Surrounding boxes:",boxes[0],boxes[1],boxes[2],boxes[3]]);
        for (var i = 0; i < 4; i++) {
            var rr = boxes[i].row;
            var cc = boxes[i].col;
            if (rr <= 0 || rr > dim - 1 || cc <= 0 || cc >= dim - 1) {
                continue;
            }
            boardAfterMove[rr][cc].owner = -1;
        }
        //log.info(["board after bombing at position", r, ",", c, ":", boardAfterMove]);
        var delta = { row: r, col: c };
        var state = { board: boardAfterMove, delta: delta };
        return { endMatchScores: null, turnIndex: turnIndexBeforeMove ^ 1, state: state };
    }
    gameLogic.throwAtomicBomb = throwAtomicBomb;
    function createInitialMove(row, col) {
        return {
            endMatchScores: null, turnIndex: 0,
            state: getInitialStateWP(row, col)
        };
    }
    gameLogic.createInitialMove = createInitialMove;
    function forSimpleTestHtml() {
        var move = gameLogic.createMove(null, 0, 1, 0);
        log.log("move=", move);
    }
    gameLogic.forSimpleTestHtml = forSimpleTestHtml;
})(gameLogic || (gameLogic = {}));
//# sourceMappingURL=gameLogic.js.map