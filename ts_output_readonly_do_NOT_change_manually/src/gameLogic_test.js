describe("In Dots and Boxes", function () {
    var X_TURN = 0;
    var O_TURN = 1;
    var NO_ONE_TURN = -1;
    var NO_ONE_WINS = null;
    var X_WIN_SCORES = [1, 0];
    var O_WIN_SCORES = [0, 1];
    var TIE_SCORES = [0, 0];
    function expectException(turnIndexBeforeMove, boardBeforeMove, row, col) {
        var stateBeforeMove = boardBeforeMove ? { board: boardBeforeMove, delta: null } : null;
        // We expect an exception to be thrown :)
        var didThrowException = false;
        try {
            gameLogic.createMove(stateBeforeMove, row, col, turnIndexBeforeMove);
        }
        catch (e) {
            didThrowException = true;
        }
        if (!didThrowException) {
            throw new Error("We expect an illegal move, but createMove didn't throw any exception!");
        }
    }
    function expectMove(turnIndexBeforeMove, boardBeforeMove, row, col, boardAfterMove, turnIndexAfterMove, endMatchScores) {
        var expectedMove = {
            turnIndex: turnIndexAfterMove,
            endMatchScores: endMatchScores,
            state: { board: boardAfterMove, delta: { row: row, col: col } }
        };
        var stateBeforeMove = boardBeforeMove ? { board: boardBeforeMove, delta: null } : null;
        var move = gameLogic.createMove(stateBeforeMove, row, col, turnIndexBeforeMove);
        expect(angular.equals(move, expectedMove)).toBe(true);
    }
    it(": Initial move", function () {
        var b = gameLogic.getInitialBoard();
        var move = gameLogic.createInitialMove();
        var expectedMove = {
            turnIndex: X_TURN,
            endMatchScores: NO_ONE_WINS,
            state: { board: b, delta: null }
        };
        expect(angular.equals(move, expectedMove)).toBe(true);
    });
    it(": X placing line on 0x1 edge from initial state", function () {
        var b = gameLogic.getInitialBoard();
        b[0][1].owner = 1;
        // b[1][1].occupies[Occupied.Up]=true;
        expectMove(X_TURN, null, 0, 1, b, O_TURN, NO_ONE_WINS);
    });
    it(": O placing line on 1x0 after X placed line on 0x1 ", function () {
        var b = gameLogic.getInitialBoard();
        b[0][1].owner = 1;
        //b[1][1].occupies[Occupied.Up]=true;
        var b_ = gameLogic.getInitialBoard();
        b_[0][1].owner = 1;
        //b_[1][1].occupies[Occupied.Up]=true;
        b_[1][0].owner = 1;
        //b_[1][1].occupies[Occupied.Left]=true;
        expectMove(O_TURN, b, 1, 0, b_, X_TURN, NO_ONE_WINS);
    });
    it("placing an O in a non-empty position is illegal", function () {
        var b = gameLogic.getInitialBoard();
        b[0][1].owner = 1;
        //b[1][1].occupies[Occupied.Up]=true;
        expectMove(X_TURN, null, 0, 1, b, O_TURN, NO_ONE_WINS);
        expectException(O_TURN, b, 0, 0);
    });
    it("cannot move after the game is over", function () {
        var b = gameLogic.getInitialBoard();
        for (var i = 0; i < b.length; i++) {
            for (var j = 0; j < b.length; j++) {
                if (b[i][j].shape == Shape.Box) {
                    b[i][j].owner = 1;
                }
            }
        }
        expectException(O_TURN, b, 2, 1);
    });
    // it("placing O in 2x1", function() {
    //   expectMove(O_TURN,
    //     [['O', 'X', ''],
    //      ['X', 'O', ''],
    //      ['X', '', '']], 2, 1,
    //     [['O', 'X', ''],
    //      ['X', 'O', ''],
    //      ['X', 'O', '']], X_TURN, NO_ONE_WINS);
    // });
    // it("X wins by placing X in 2x0", function() {
    //   expectMove(X_TURN,
    //     [['X', 'O', ''],
    //      ['X', 'O', ''],
    //      ['', '', '']], 2, 0,
    //     [['X', 'O', ''],
    //      ['X', 'O', ''],
    //      ['X', '', '']], NO_ONE_TURN, X_WIN_SCORES);
    // });
    // it("O wins by placing O in 1x1", function() {
    //   expectMove(O_TURN,
    //     [['X', 'X', 'O'],
    //      ['X', '', ''],
    //      ['O', '', '']], 1, 1,
    //     [['X', 'X', 'O'],
    //      ['X', 'O', ''],
    //      ['O', '', '']], NO_ONE_TURN, O_WIN_SCORES);
    // });
    // it("the game ties when there are no more empty cells", function() {
    //   expectMove(X_TURN,
    //     [['X', 'O', 'X'],
    //      ['X', 'O', 'O'],
    //      ['O', 'X', '']], 2, 2,
    //     [['X', 'O', 'X'],
    //      ['X', 'O', 'O'],
    //      ['O', 'X', 'X']], NO_ONE_TURN, TIE_SCORES);
    // });
    // it("placing X outside the board (in 0x3) is illegal", function() {
    //   expectException(X_TURN,
    //     [['', '', ''],
    //      ['', '', ''],
    //      ['', '', '']], 0, 3);
    // });
});
//# sourceMappingURL=gameLogic_test.js.map