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
    gameLogic.ROWS = 15;
    gameLogic.COLS = 15;
    /**
     * Private method for initiating the board with the size we need
     */
    function createNewBoard(row, col) {
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
    function getInitialBoard() {
        return createNewBoard(gameLogic.ROWS, gameLogic.COLS);
    }
    gameLogic.getInitialBoard = getInitialBoard;
    function getInitialState() {
        return { board: getInitialBoard(), delta: null };
    }
    gameLogic.getInitialState = getInitialState;
    /**
     * Create Move
     */
    function createMove(stateBeforeMove, row, col, turnIndexBeforeMove) {
        if (!stateBeforeMove) {
            stateBeforeMove = getInitialState();
        }
        var board = stateBeforeMove.board;
        if (isOver(board)) {
            throw new Error("Can only make a move if the game is not over!");
        }
        //If the shape of this grid is not line, return
        if (board[row][col].shape != Shape.Line) {
            throw new Error("Cannot put it here man");
        }
        if (board[row][col].owner >= 0) {
            throw new Error("No further move can be created because this line is already occupied");
        }
        var boardAfterMove = angular.copy(board);
        var turnIndex;
        //Now this edge was owned, turn it to 1.
        boardAfterMove[row][col].owner = 1;
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
            if (row < gameLogic.ROWS - 1) {
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
            if (col < gameLogic.COLS - 1) {
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
        var endMatchScores;
        if (isOver(board)) {
            turnIndex = -1;
            if (getWinner(board) == -1) {
                endMatchScores = [0, 0];
            }
            if (getWinner(board) == 1) {
                endMatchScores = [0, 1];
            }
            if (getWinner(board) == 0) {
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
        return board[row - 1][col].owner >= 0 &&
            board[row + 1][col].owner >= 0 &&
            board[row][col - 1].owner >= 0 &&
            board[row][col + 1].owner >= 0;
    }
    /**
     * Find out who wins
     */
    function getWinner(board) {
        var count;
        for (var i = 0; i < gameLogic.ROWS; i++) {
            for (var j = 0; j < gameLogic.COLS; j++) {
                if (board[i][j].shape == Shape.Box) {
                    count[board[i][j].owner]++;
                }
            }
        }
        var maxCount = 0;
        var winner;
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
        for (var i = 0; i < gameLogic.ROWS; i++) {
            for (var j = 0; j < gameLogic.COLS; j++) {
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
    function createInitialMove() {
        return { endMatchScores: null, turnIndex: 0,
            state: getInitialState() };
    }
    gameLogic.createInitialMove = createInitialMove;
    function forSimpleTestHtml() {
        var move = gameLogic.createMove(null, 0, 1, 0);
        log.log("move=", move);
    }
    gameLogic.forSimpleTestHtml = forSimpleTestHtml;
})(gameLogic || (gameLogic = {}));
//# sourceMappingURL=gameLogic.js.map