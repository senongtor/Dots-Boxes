;
var game;
(function (game) {
    game.isModalShown = false;
    game.modalTitle = "";
    game.modalBody = "";
    game.$rootScope = null;
    game.$timeout = null;
    // Global variables are cleared when getting updateUI.
    // I export all variables to make it easy to debug in the browser by
    // simply typing in the console, e.g.,
    // game.currentUpdateUI
    game.currentUpdateUI = null;
    game.didMakeMove = false; // You can only make one move per updateUI
    game.animationEndedTimeout = null;
    game.state = null;
    // For community games.
    game.proposals = null;
    game.yourPlayerInfo = null;
    game.row = 11;
    game.col = 11;
    game.dimSet = false;
    game.bombEnabled = true;
    game.board = null;
    function init($rootScope_, $timeout_) {
        game.$rootScope = $rootScope_;
        game.$timeout = $timeout_;
        registerServiceWorker();
        translate.setTranslations(getTranslations());
        translate.setLanguage('en');
        resizeGameAreaService.setWidthToHeight(1);
        gameService.setGame({
            updateUI: updateUI,
            getStateForOgImage: null,
        });
    }
    game.init = init;
    function registerServiceWorker() {
        // I prefer to use appCache over serviceWorker
        // (because iOS doesn't support serviceWorker, so we have to use appCache)
        // I've added this code for a future where all browsers support serviceWorker (so we can deprecate appCache!)
        if (!window.applicationCache && 'serviceWorker' in navigator) {
            var n = navigator;
            log.log('Calling serviceWorker.register');
            n.serviceWorker.register('service-worker.js').then(function (registration) {
                log.log('ServiceWorker registration successful with scope: ', registration.scope);
            }).catch(function (err) {
                log.log('ServiceWorker registration failed: ', err);
            });
        }
    }
    function getTranslations() {
        return {};
    }
    function isProposal(row, col) {
        return game.proposals && game.proposals[row][col] > 0;
    }
    game.isProposal = isProposal;
    function getCellStyle(row, col) {
        if (!isProposal(row, col))
            return {};
        // proposals[row][col] is > 0
        var countZeroBased = game.proposals[row][col] - 1;
        var maxCount = game.currentUpdateUI.numberOfPlayersRequiredToMove - 2;
        var ratio = maxCount == 0 ? 1 : countZeroBased / maxCount; // a number between 0 and 1 (inclusive).
        // scale will be between 0.6 and 0.8.
        var scale = 0.6 + 0.2 * ratio;
        // opacity between 0.5 and 0.7
        var opacity = 0.5 + 0.2 * ratio;
        return {
            transform: "scale(" + scale + ", " + scale + ")",
            opacity: "" + opacity,
        };
    }
    game.getCellStyle = getCellStyle;
    function getProposalsBoard(playerIdToProposal) {
        var proposals = [];
        //TODO
        for (var i = 0; i < gameLogic.rows; i++) {
            proposals[i] = [];
            for (var j = 0; j < gameLogic.cols; j++) {
                proposals[i][j] = 0;
            }
        }
        for (var playerId in playerIdToProposal) {
            var proposal = playerIdToProposal[playerId];
            var delta = proposal.data;
            proposals[delta.row][delta.col]++;
        }
        return proposals;
    }
    function updateUI(params) {
        log.info("Game got updateUI:", params);
        var playerIdToProposal = params.playerIdToProposal;
        // Only one move/proposal per updateUI
        game.didMakeMove = playerIdToProposal && playerIdToProposal[game.yourPlayerInfo.playerId] != undefined;
        game.yourPlayerInfo = params.yourPlayerInfo;
        game.proposals = playerIdToProposal ? getProposalsBoard(playerIdToProposal) : null;
        if (playerIdToProposal) {
            // If only proposals changed, then return.
            // I don't want to disrupt the player if he's in the middle of a move.
            // I delete playerIdToProposal field from params (and so it's also not in currentUpdateUI),
            // and compare whether the objects are now deep-equal.
            params.playerIdToProposal = null;
            if (game.currentUpdateUI && angular.equals(game.currentUpdateUI, params))
                return;
        }
        game.currentUpdateUI = params;
        clearAnimationTimeout();
        game.state = params.state;
        log.info(params.state);
        if (isFirstMove()) {
            log.info("Update state initial");
            game.dimSet = false;
            game.state = gameLogic.getInitialStateWP(game.row, game.col);
            if (playerIdToProposal)
                setDim(15, 15);
        }
        else {
            log.info("Update state");
            game.state = params.state;
            game.dimSet = true;
            game.row = game.state.board.length;
            game.col = game.state.board.length;
        }
        //Unbomb all bombs, and check if any edge has been occupied.
        var anyEdgeOccupied = false;
        for (var i = 0; i < game.state.board.length; i++) {
            for (var j = 0; j < game.state.board.length; j++) {
                if (game.state.board[i][j].shape == Shape.Box) {
                    game.state.board[i][j].isBomb = false;
                }
                if (game.state.board[i][j].shape == Shape.Line) {
                    if (game.state.board[i][j].owner != -1) {
                        anyEdgeOccupied = true;
                    }
                }
            }
        }
        //Generate a number. If no edge has been occupied, don't introduce bomb
        if (anyEdgeOccupied && game.bombEnabled) {
            var rr = Math.floor(Math.random() * 100);
            //If the number is in a certain range, generate new bomb
            if (rr < 100 / game.state.board.length) {
                log.info(["Random number is: ", rr]);
                while (true) {
                    var i = Math.floor(Math.random() * (game.state.board.length - 2) + 1);
                    var j = Math.floor(Math.random() * (game.state.board.length - 2) + 1);
                    if (game.state.board[i][j].shape == Shape.Box && anySurroundingOccupied(i, j)) {
                        log.info(["Bomb is at: ", i, j]);
                        game.state.board[i][j].isBomb = true;
                        break;
                    }
                }
            }
        }
        // We calculate the AI move only after the animation finishes,
        // because if we call aiService now
        // then the animation will be paused until the javascript finishes.
        game.animationEndedTimeout = game.$timeout(animationEndedCallback, 500);
    }
    game.updateUI = updateUI;
    function anySurroundingOccupied(row, col) {
        var directions = {};
        directions[0] = { row: row - 1, col: col };
        directions[1] = { row: row + 1, col: col };
        directions[2] = { row: row, col: col + 1 };
        directions[3] = { row: row, col: col - 1 };
        for (var i = 0; i < 4; i++) {
            if (game.state.board[directions[i].row][directions[i].col].owner != -1) {
                return true;
            }
        }
        return false;
    }
    function animationEndedCallback() {
        log.info("Animation ended");
        maybeSendComputerMove();
    }
    function clearAnimationTimeout() {
        if (game.animationEndedTimeout) {
            game.$timeout.cancel(game.animationEndedTimeout);
            game.animationEndedTimeout = null;
        }
    }
    function maybeSendComputerMove() {
        if (!isComputerTurn())
            return;
        var currentMove = {
            endMatchScores: game.currentUpdateUI.endMatchScores,
            state: game.currentUpdateUI.state,
            turnIndex: game.currentUpdateUI.turnIndex,
        };
        var move = aiService.findComputerMove(currentMove);
        log.info("Computer move: ", move);
        makeMove(move);
    }
    function setDim(r, c) {
        game.row = r;
        game.col = c;
        game.dimSet = true;
        gameLogic.rows = game.row;
        gameLogic.cols = game.col;
        game.state = gameLogic.getInitialStateWP(game.row, game.col);
        log.info("Dimension is set to ", game.row, game.col);
    }
    game.setDim = setDim;
    function makeMove(move) {
        if (game.didMakeMove) {
            return;
        }
        game.didMakeMove = true;
        if (!game.proposals) {
            gameService.makeMove(move, null);
        }
        else {
            var delta = move.state.delta;
            var myProposal = {
                data: delta,
                chatDescription: '' + (delta.row + 1) + 'x' + (delta.col + 1),
                playerInfo: game.yourPlayerInfo,
            };
            // Decide whether we make a move or not (if we have <currentCommunityUI.numberOfPlayersRequiredToMove-1> other proposals supporting the same thing).
            if (game.proposals[delta.row][delta.col] < game.currentUpdateUI.numberOfPlayersRequiredToMove - 1) {
                move = null;
            }
            gameService.makeMove(move, myProposal);
        }
    }
    function isFirstMove() {
        return !game.currentUpdateUI.state;
    }
    function yourPlayerIndex() {
        return game.currentUpdateUI.yourPlayerIndex;
    }
    function isComputer() {
        var playerInfo = game.currentUpdateUI.playersInfo[game.currentUpdateUI.yourPlayerIndex];
        // In community games, playersInfo is [].
        return playerInfo && playerInfo.playerId === '';
    }
    function isComputerTurn() {
        return isMyTurn() && isComputer();
    }
    function isHumanTurn() {
        return isMyTurn() && !isComputer();
    }
    game.isHumanTurn = isHumanTurn;
    function isMyTurn() {
        return !game.didMakeMove &&
            game.currentUpdateUI.turnIndex >= 0 &&
            game.currentUpdateUI.yourPlayerIndex === game.currentUpdateUI.turnIndex; // it's my turn
    }
    function cellClicked(row, col) {
        log.info("Clicked on cell:", row, col, "index: ", game.currentUpdateUI.turnIndex);
        if (!isHumanTurn())
            return;
        var nextMove = null;
        try {
            nextMove = gameLogic.createMove(game.state, row, col, game.currentUpdateUI.turnIndex);
        }
        catch (e) {
            log.info(["Cell is already full in position:", row, col, e]);
            return;
        }
        makeMove(nextMove);
    }
    game.cellClicked = cellClicked;
    function isBomb(row, col) {
        return game.state.board[row][col].shape == Shape.Box &&
            game.state.board[row][col].isBomb && game.state.board[row][col].owner == -1;
    }
    game.isBomb = isBomb;
    function enableBomb() {
        game.bombEnabled = true;
    }
    game.enableBomb = enableBomb;
    function disableBomb() {
        game.bombEnabled = false;
    }
    game.disableBomb = disableBomb;
    function shouldColorVisitedEdge(row, col) {
        if (game.state.board[row][col].shape != Shape.Line) {
            return false;
        }
        if (game.state.delta == null) {
            return false;
        }
        return (game.state.delta.row != row || game.state.delta.col != col) && game.state.board[row][col].owner != -1 || isProposal(row, col);
    }
    game.shouldColorVisitedEdge = shouldColorVisitedEdge;
    function shouldColorVisitedEdgePl0(row, col) {
        if (game.state.board[row][col].shape != Shape.Line) {
            return false;
        }
        if (game.state.delta == null) {
            return false;
        }
        return game.state.board[row][col].owner == 0 || isProposal(row, col);
    }
    game.shouldColorVisitedEdgePl0 = shouldColorVisitedEdgePl0;
    function shouldColorVisitedEdgePl1(row, col) {
        if (game.state.board[row][col].shape != Shape.Line) {
            return false;
        }
        if (game.state.delta == null) {
            return false;
        }
        return game.state.board[row][col].owner == 1 || isProposal(row, col);
    }
    game.shouldColorVisitedEdgePl1 = shouldColorVisitedEdgePl1;
    function isOccupied(row, col, turnIndex) {
        return (game.state.board[row][col].shape == Shape.Box && game.state.board[row][col].owner == turnIndex) ||
            (isProposal(row, col) && game.currentUpdateUI.turnIndex == turnIndex);
    }
    function isOccupiedBy0(row, col) {
        return isOccupied(row, col, 0);
    }
    game.isOccupiedBy0 = isOccupiedBy0;
    function isOccupiedBy1(row, col) {
        return isOccupied(row, col, 1);
    }
    game.isOccupiedBy1 = isOccupiedBy1;
    function shouldSlowlyAppear(row, col) {
        return game.state.delta &&
            game.state.delta.row === row &&
            game.state.delta.col === col;
    }
    game.shouldSlowlyAppear = shouldSlowlyAppear;
    function sizeSmall(r) {
        switch (game.row) {
            case 7:
                return Math.floor(r / 2) * (26.933333 + 4.8) + (r % 2) * 4.8;
            case 11:
                return Math.floor(r / 2) * (14.6 + 4.5) + (r % 2) * 4.5;
            case 13:
                return Math.floor(r / 2) * (11.65 + 4.3) + (r % 2) * 4.3;
        }
    }
    game.sizeSmall = sizeSmall;
    function sizeBig(r) {
        switch (game.row) {
            case 7:
                return ((r + 1) % 2) * 4.8 + (r % 2) * 26.933333;
            case 11:
                return ((r + 1) % 2) * 4.5 + (r % 2) * 14.6;
            case 13:
                return ((r + 1) % 2) * 4.3 + (r % 2) * 11.65;
        }
    }
    game.sizeBig = sizeBig;
    //======MENU========
    function fontSizePx() {
        // for iphone4 (min(width,height)=320) it should be 8.
        return 8 * Math.min(window.innerWidth, window.innerHeight) / 320;
    }
    game.fontSizePx = fontSizePx;
    function getRange() {
        var list = [];
        for (var i = 0; i < game.row; i++) {
            list[i] = i;
        }
        return list;
    }
    game.getRange = getRange;
})(game || (game = {}));
angular.module('myApp', ['gameServices'])
    .run(['$rootScope', '$timeout',
    function ($rootScope, $timeout) {
        $rootScope['game'] = game;
        game.init($rootScope, $timeout);
    }]);
//# sourceMappingURL=game.js.map