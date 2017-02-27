/**
 * 4 Direction for each grid
 */
var Direction;
(function (Direction) {
    Direction[Direction["Up"] = 1] = "Up";
    Direction[Direction["Down"] = 2] = "Down";
    Direction[Direction["Left"] = 3] = "Left";
    Direction[Direction["Right"] = 4] = "Right";
})(Direction || (Direction = {}));
/**
 * Grid that will model the region
 */
var Grid = (function () {
    function Grid() {
        this.directions = {};
        this.directions[Direction.Up] = false;
        this.directions[Direction.Down] = false;
        this.directions[Direction.Left] = false;
        this.directions[Direction.Right] = false;
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
    gameLogic.ROWS = 5;
    gameLogic.COLS = 4;
    function getInitialBoard() {
        var board = [];
        for (var i = 0; i < gameLogic.ROWS; i++) {
            board[i] = [];
            for (var j = 0; j < gameLogic.COLS; j++) {
                board[i][j] = new Grid();
                board[i][j].owner = -1;
            }
        }
        return board;
    }
    gameLogic.getInitialBoard = getInitialBoard;
    function getInitialState() {
        return { board: getInitialBoard(), delta: null };
    }
    gameLogic.getInitialState = getInitialState;
    /**
     * Create Move
     */
    function createMove(stateBeforeMove, row, col, d, turnIndexBeforeMove) {
        if (!stateBeforeMove) {
            stateBeforeMove = getInitialState();
        }
        var board = stateBeforeMove.board;
        if (isOver(board)) {
            throw new Error("Can only make a move if the game is not over!");
        }
        if (board[row][col].owner > 0) {
            throw new Error("No further move can be created because this square is already occupied");
        }
        if (board[row][col].directions[d]) {
            throw new Error("No further move can be created because this edge is already occupied");
        }
        var boardAfterMove = angular.copy(board);
        var turnIndex;
        boardAfterMove[row][col].directions[d] = true;
        //If all 4 edges of this grid is occupied, 
        //assign the current move player as the owner
        if (board[row][col].directions[Direction.Up] &&
            board[row][col].directions[Direction.Down] &&
            board[row][col].directions[Direction.Left] &&
            board[row][col].directions[Direction.Right]) {
            board[row][col].owner = turnIndexBeforeMove;
            turnIndex = turnIndexBeforeMove;
        }
        else {
            turnIndex = turnIndexBeforeMove ^ 1;
        }
        // let winner = getWinner(boardAfterMove);
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
        var delta = { row: row, col: col, direction: d };
        var state = { board: boardAfterMove, delta: delta };
        return { endMatchScores: endMatchScores, turnIndex: turnIndex, state: state };
    }
    gameLogic.createMove = createMove;
    function getWinner(board) {
        var count;
        for (var i = 0; i < gameLogic.ROWS; i++) {
            for (var j = 0; j < gameLogic.COLS; j++) {
                count[board[i][j].owner]++;
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
        return -1;
    }
    /**
     * Check for game termination
     */
    function isOver(board) {
        for (var i = 0; i < gameLogic.ROWS; i++) {
            for (var j = 0; j < gameLogic.COLS; j++) {
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
        var move = gameLogic.createMove(null, 0, 0, Direction.Up, 0);
        log.log("move=", move);
    }
    gameLogic.forSimpleTestHtml = forSimpleTestHtml;
})(gameLogic || (gameLogic = {}));
//# sourceMappingURL=gameLogic.js.map