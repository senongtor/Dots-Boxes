interface SupportedLanguages {
  en: string, iw: string,
  pt: string, zh: string,
  el: string, fr: string,
  hi: string, es: string,
};

module game {
  export let isModalShown = false;
  export let modalTitle = "";
  export let modalBody = "";

  export let $rootScope: angular.IScope = null;
  export let $timeout: angular.ITimeoutService = null;

  // Global variables are cleared when getting updateUI.
  // I export all variables to make it easy to debug in the browser by
  // simply typing in the console, e.g.,
  // game.currentUpdateUI
  export let currentUpdateUI: IUpdateUI = null;
  export let didMakeMove: boolean = false; // You can only make one move per updateUI
  export let animationEndedTimeout: ng.IPromise<any> = null;
  export let state: IState = null;
  // For community games.
  export let proposals: number[][] = null;
  export let yourPlayerInfo: IPlayerInfo = null;

  export let row = 11;
  export let col = 11;
  export let dimSet = false;
  export let bombEnabled = true;
  export let board: Board = null;

  export function init($rootScope_: angular.IScope, $timeout_: angular.ITimeoutService) {
    $rootScope = $rootScope_;
    $timeout = $timeout_;
    registerServiceWorker();
    translate.setTranslations(getTranslations());
    translate.setLanguage('en');
    resizeGameAreaService.setWidthToHeight(1);
    gameService.setGame({
      updateUI: updateUI,
      getStateForOgImage: null,
    });
  }

  function registerServiceWorker() {
    // I prefer to use appCache over serviceWorker
    // (because iOS doesn't support serviceWorker, so we have to use appCache)
    // I've added this code for a future where all browsers support serviceWorker (so we can deprecate appCache!)
    if (!window.applicationCache && 'serviceWorker' in navigator) {
      let n: any = navigator;
      log.log('Calling serviceWorker.register');
      n.serviceWorker.register('service-worker.js').then(function (registration: any) {
        log.log('ServiceWorker registration successful with scope: ', registration.scope);
      }).catch(function (err: any) {
        log.log('ServiceWorker registration failed: ', err);
      });
    }
  }

  function getTranslations(): Translations {
    return {};
  }

  export function isProposal(row: number, col: number) {
    return proposals && proposals[row][col] > 0;
  }

  export function getCellStyle(row: number, col: number): Object {
    if (!isProposal(row, col)) return {};
    // proposals[row][col] is > 0
    let countZeroBased = proposals[row][col] - 1;
    let maxCount = currentUpdateUI.numberOfPlayersRequiredToMove - 2;
    let ratio = maxCount == 0 ? 1 : countZeroBased / maxCount; // a number between 0 and 1 (inclusive).
    // scale will be between 0.6 and 0.8.
    let scale = 0.6 + 0.2 * ratio;
    // opacity between 0.5 and 0.7
    let opacity = 0.5 + 0.2 * ratio;
    return {
      transform: `scale(${scale}, ${scale})`,
      opacity: "" + opacity,
    };
  }

  function getProposalsBoard(playerIdToProposal: IProposals): number[][] {
    let proposals: number[][] = [];
    //TODO
    for (let i = 0; i < gameLogic.rows; i++) {
      proposals[i] = [];
      for (let j = 0; j < gameLogic.cols; j++) {
        proposals[i][j] = 0;
      }
    }
    for (let playerId in playerIdToProposal) {
      let proposal = playerIdToProposal[playerId];
      let delta = proposal.data;
      proposals[delta.row][delta.col]++;
    }
    return proposals;
  }

  export function updateUI(params: IUpdateUI): void {
    log.info("Game got updateUI:", params);
    let playerIdToProposal = params.playerIdToProposal;
    // Only one move/proposal per updateUI
    didMakeMove = playerIdToProposal && playerIdToProposal[yourPlayerInfo.playerId] != undefined;
    yourPlayerInfo = params.yourPlayerInfo;
    proposals = playerIdToProposal ? getProposalsBoard(playerIdToProposal) : null;
    if (playerIdToProposal) {
      // If only proposals changed, then return.
      // I don't want to disrupt the player if he's in the middle of a move.
      // I delete playerIdToProposal field from params (and so it's also not in currentUpdateUI),
      // and compare whether the objects are now deep-equal.
      params.playerIdToProposal = null;
      if (currentUpdateUI && angular.equals(currentUpdateUI, params)) return;
    }

    currentUpdateUI = params;
    clearAnimationTimeout();
    state = params.state;
    log.info(params.state);
    if (isFirstMove()) {
      log.info("Update state initial");
      dimSet = false;
      state = gameLogic.getInitialStateWP(row, col);
      if (playerIdToProposal) setDim(15, 15);
    } else {
      log.info("Update state");
      state = params.state;
      dimSet = true;
      row = state.board.length;
      col = state.board.length;
    }
    //Unbomb all bombs, and check if any edge has been occupied.
    let anyEdgeOccupied: boolean = false;
    for (let i = 0; i < state.board.length; i++) {
      for (let j = 0; j < state.board.length; j++) {
        if (state.board[i][j].shape == Shape.Box) {
          state.board[i][j].isBomb = false;
        }
        if (state.board[i][j].shape == Shape.Line) {
          if (state.board[i][j].owner != -1) {
            anyEdgeOccupied = true;
          }
        }
      }
    }
    //Generate a number. If no edge has been occupied, don't introduce bomb
    if (anyEdgeOccupied && bombEnabled) {
      let rr = Math.floor(Math.random() * 100);
      //If the number is in a certain range, generate new bomb
      if (rr < 100 / state.board.length) {
        log.info(["Random number is: ", rr]);
        while (true) {
          let i = Math.floor(Math.random() * (state.board.length - 2) + 1);
          let j = Math.floor(Math.random() * (state.board.length - 2) + 1);
          if (state.board[i][j].shape == Shape.Box && anySurroundingOccupied(i, j)) {
            log.info(["Bomb is at: ", i, j]);
            state.board[i][j].isBomb = true;
            break;
          }
        }
      }
    }

    // We calculate the AI move only after the animation finishes,
    // because if we call aiService now
    // then the animation will be paused until the javascript finishes.
    animationEndedTimeout = $timeout(animationEndedCallback, 500);
  }

  function anySurroundingOccupied(row: number, col: number): boolean {
    let directions: { [id: number]: { row: number, col: number } } = {};
    directions[0] = { row: row - 1, col: col };
    directions[1] = { row: row + 1, col: col };
    directions[2] = { row: row, col: col + 1 };
    directions[3] = { row: row, col: col - 1 };

    for (let i = 0; i < 4; i++) {
      if (state.board[directions[i].row][directions[i].col].owner != -1) {
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
    if (animationEndedTimeout) {
      $timeout.cancel(animationEndedTimeout);
      animationEndedTimeout = null;
    }
  }

  function maybeSendComputerMove() {
    if (!isComputerTurn()) return;
    let currentMove: IMove = {
      endMatchScores: currentUpdateUI.endMatchScores,
      state: currentUpdateUI.state,
      turnIndex: currentUpdateUI.turnIndex,
    }
    let move = aiService.findComputerMove(currentMove);
    log.info("Computer move: ", move);
    makeMove(move);
  }

  export function setDim(r: number, c: number) {
    row = r;
    col = c;
    dimSet = true;
    gameLogic.rows = row;
    gameLogic.cols = col;
    state = gameLogic.getInitialStateWP(row, col);
    log.info("Dimension is set to ", row, col);
  }

  function makeMove(move: IMove) {
    if (didMakeMove) { // Only one move per updateUI
      return;
    }
    didMakeMove = true;

    if (!proposals) {
      gameService.makeMove(move, null);
    } else {
      let delta = move.state.delta;
      let myProposal: IProposal = {
        data: delta,
        chatDescription: '' + (delta.row + 1) + 'x' + (delta.col + 1),
        playerInfo: yourPlayerInfo,
      };
      // Decide whether we make a move or not (if we have <currentCommunityUI.numberOfPlayersRequiredToMove-1> other proposals supporting the same thing).
      if (proposals[delta.row][delta.col] < currentUpdateUI.numberOfPlayersRequiredToMove - 1) {
        move = null;
      }
      gameService.makeMove(move, myProposal);
    }
  }
  function isFirstMove() {
    return !currentUpdateUI.state;
  }

  function yourPlayerIndex() {
    return currentUpdateUI.yourPlayerIndex;
  }

  function isComputer() {
    let playerInfo = currentUpdateUI.playersInfo[currentUpdateUI.yourPlayerIndex];
    // In community games, playersInfo is [].
    return playerInfo && playerInfo.playerId === '';
  }

  function isComputerTurn() {
    return isMyTurn() && isComputer();
  }

  export function isHumanTurn() {
    return isMyTurn() && !isComputer();
  }

  function isMyTurn() {
    return !didMakeMove && // you can only make one move per updateUI.
      currentUpdateUI.turnIndex >= 0 && // game is ongoing
      currentUpdateUI.yourPlayerIndex === currentUpdateUI.turnIndex; // it's my turn
  }

  export function cellClicked(row: number, col: number): void {
    log.info("Clicked on cell:", row, col, "index: ", currentUpdateUI.turnIndex);
    if (!isHumanTurn()) return;
    let nextMove: IMove = null;
    try {
      nextMove = gameLogic.createMove(
        state, row, col, currentUpdateUI.turnIndex);
    } catch (e) {
      log.info(["Cell is already full in position:", row, col, e]);
      return;
    }
    makeMove(nextMove);
  }

  export function isBomb(row: number, col: number): boolean {
    return state.board[row][col].shape == Shape.Box &&
      state.board[row][col].isBomb && state.board[row][col].owner == -1;
  }

  export function enableBomb() {
    bombEnabled = true;
  }
  export function disableBomb() {
    bombEnabled = false;
  }

  // export function shouldColorVisitedEdge(row: number, col: number): boolean {
  //   if (state.board[row][col].shape != Shape.Line) {
  //     return false;
  //   }
  //   if (state.delta == null) {
  //     return false;
  //   }
  //   return (state.delta.row != row || state.delta.col != col) && state.board[row][col].owner != -1 || isProposal(row, col);
  // }

  export function shouldColorVisitedEdgePl0(row: number, col: number): boolean {
    if (state.board[row][col].shape != Shape.Line) {
      return false;
    }
    // if (state.delta == null) {
    //   return false;
    // }
    return state.board[row][col].owner == 0 || isProposal(row, col);
  }

  export function shouldColorVisitedEdgePl1(row: number, col: number): boolean {
    if (state.board[row][col].shape != Shape.Line) {
      return false;
    }
    // if (state.delta == null) {
    //   return false;
    // }

    return state.board[row][col].owner == 1 || isProposal(row, col);
  }

  function isOccupied(row: number, col: number, turnIndex: number): boolean {
    return (state.board[row][col].shape == Shape.Box && state.board[row][col].owner == turnIndex) ||
      (isProposal(row, col) && currentUpdateUI.turnIndex == turnIndex);
  }

  export function isOccupiedBy0(row: number, col: number): boolean {
    return isOccupied(row, col, 0);
  }

  export function isOccupiedBy1(row: number, col: number): boolean {
    return isOccupied(row, col, 1);
  }

  export function shouldSlowlyAppear(row: number, col: number): boolean {
    return state.delta &&
      state.delta.row === row &&
      state.delta.col === col;
  }
  export function sizeSmall(r: number): number {
    switch (row) {
      case 7:
        return Math.floor(r / 2) * (28 + 4) + (r % 2) * 4;
      case 11:
        return Math.floor(r / 2) * (15.2 + 4) + (r % 2) * 4;
      case 15:
        return Math.floor(r / 2) * (10.2857 + 3.5) + (r % 2) * 3.5;
    }
  }

  export function sizeBig(r: number): number {
    switch (row) {
      case 7:
        return ((r + 1) % 2) * 4 + (r % 2) * 28;
      case 11:
        return ((r + 1) % 2) * 4 + (r % 2) * 15.2;
      case 15:
        return ((r + 1) % 2) * 3.5 + (r % 2) * 10.2857;
    }
  }

  //======MENU========
  export function fontSizePx(): number {
    // for iphone4 (min(width,height)=320) it should be 8.
    return 8 * Math.min(window.innerWidth, window.innerHeight) / 320;
  }

  export function getRange() {
    let list: number[] = []
    for (let i = 0; i < row; i++) {
      list[i] = i;
    }
    return list;
  }
}

angular.module('myApp', ['gameServices'])
  .run(['$rootScope', '$timeout',
    function ($rootScope: angular.IScope, $timeout: angular.ITimeoutService) {
      $rootScope['game'] = game;
      game.init($rootScope, $timeout);
    }]);
