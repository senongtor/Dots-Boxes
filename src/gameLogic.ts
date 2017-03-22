/**
 * 4 Direction for each grid
 */
enum Direction {
    Hor = 1,
    Ver,
    Bomb
}
enum Shape { 
    Dot = 1,
    Box,
    Line
}

enum Occupied{
    Up = 1,
    Down,
    Left,
    Right
}

type IProposalData = BoardDelta;
interface BoardDelta {
  row: number;
  col: number;
}

/**
 * Grid that will model the region 
 */
class Grid{
    //This dict for mark the occupation of four surrounding edges
    //occupies: {[id:number]: boolean}={};
    //This Enum is for distinguish box,dot and line grid
    shape: Shape;
    //To specify owner. Only for box there is a real owner assigned. For line
    //just assign 1
    owner: number;
    //This is only for line grid. It has two state, horizontal and vertical.
    dir: Direction;
    constructor(){       
        this.owner=-1;
    }
}

type Board = Grid[][];

interface IState {
  board: Board;
  delta: BoardDelta;
}

import gameService = gamingPlatform.gameService;
import alphaBetaService = gamingPlatform.alphaBetaService;
import translate = gamingPlatform.translate;
import resizeGameAreaService = gamingPlatform.resizeGameAreaService;
import log = gamingPlatform.log;
import dragAndDropService = gamingPlatform.dragAndDropService;

module gameLogic {     
      /**
       * Private method for initiating the board with the size we need
       */
      //TODO
      export let rows:number;
      export let cols:number;
      function createNewBoard(row: number, col: number): Board {
          rows=row;
          cols=col;

        let board: Board = [];
        for (let i = 0; i < row; i++) {
            board[i] = [];
            for (let j = 0; j < col; j++) {
                board[i][j]=new Grid();
                //[][     ][][      ][]
                if(i%2==0){
                    if(j%2==0){
                        board[i][j].shape=Shape.Dot;
                    }else{
                        board[i][j].shape=Shape.Line;
                        board[i][j].dir=Direction.Hor;
                    }
                    //|[BOX]|[BOX ]                    
                }else{
                    if(j%2==0){
                        board[i][j].shape=Shape.Line;
                        board[i][j].dir=Direction.Ver;
                    }else{
                        board[i][j].shape=Shape.Box;
                    }
                }
            }
        }
        return board;
      }

      export function getInitialBoardWP(row: number,col: number){
        return createNewBoard(row,col);
      }
    //   export function getInitialBoard(): Board {
    //     return createNewBoard();
    //   }
      export function getInitialStateWP(row:number, col:number): IState {
        return {board: getInitialBoardWP(row,col), delta: null};
      }
    
    //   export function getInitialState(): IState {
    //     return {board: getInitialBoard(), delta: null};
    //   }
      /**
       * Create Move
       */
      export function createMove(
          stateBeforeMove: IState, row: number, col: number,  
          turnIndexBeforeMove: number):IMove{
        let board: Board = stateBeforeMove.board;
        let dim = board.length;
        if (!stateBeforeMove) {
            stateBeforeMove = getInitialStateWP(dim,dim);
        }
        if (isOver(board)) {
            throw new Error("Can only make a move if the game is not over!");
        }
        //If the shape of this grid is not line, return
        if(board[row][col].shape!=Shape.Line){
            throw new Error("Cannot put it here man");
        }
        if(board[row][col].owner>=0){
            throw new Error("No further move can be created because this line is already occupied");
        }
        // if(board[row][col].shape!=Shape.Box){
        //     if(board[row][col].dir==Direction.Bomb){
        //         return null;
        //     }
        // }
        let boardAfterMove = angular.copy(board);
        let turnIndex: number;
        //Now this edge was owned, turn it to 1.
        boardAfterMove[row][col].owner=1;
       
        //assign the current move player as the owner of that edge
        //If the edge is horizontal, check up and down box
        //If the edge is vertical, check left and right box
        //If any adjcent box has all edges taken, assign the current player as the owner of that box    
        if(boardAfterMove[row][col].dir==Direction.Hor){
            let streak: boolean=false;
            if(row>0){
                if(boxOccupied(boardAfterMove,row-1,col)){
                    boardAfterMove[row-1][col].owner=turnIndexBeforeMove;
                    turnIndex=turnIndexBeforeMove;
                    streak=true;
                }
            }
            if(row<dim-1){
                if(boxOccupied(boardAfterMove,row+1,col)){
                    boardAfterMove[row+1][col].owner=turnIndexBeforeMove;
                    turnIndex=turnIndexBeforeMove;
                    streak=true;
                }
            }
            if(!streak){
                    turnIndex=turnIndexBeforeMove^1;
            }
        //For the vertical line placed for current player   
        }else if(boardAfterMove[row][col].dir==Direction.Ver){
            let streak: boolean=false;
            //If the line has left box.
            if(col>0){
                if(boxOccupied(boardAfterMove,row,col-1)){
                    boardAfterMove[row][col-1].owner=turnIndexBeforeMove;
                    turnIndex=turnIndexBeforeMove;
                    streak=true;
                }
            }
            //If the line has right box.
            if(col<dim-1){
                if(boxOccupied(boardAfterMove,row,col+1)){
                    boardAfterMove[row][col+1].owner=turnIndexBeforeMove;
                    turnIndex=turnIndexBeforeMove;
                    streak=true;
                }
            }
            if(!streak){
                turnIndex=turnIndexBeforeMove^1;
            }
        }

        let endMatchScores: number[];
        
        if (isOver(board)){
            turnIndex = -1;
            if(getWinner(board) == -1){
                endMatchScores=[0,0];
            }
            if(getWinner(board)==1){
                endMatchScores=[0,1];
            }
            if(getWinner(board)==0){
                endMatchScores=[1,0];
            }     
        }else{
            endMatchScores=null;
        }
        
        let delta: BoardDelta = {row: row, col: col};
        let state: IState = {board: boardAfterMove, delta: delta};
        return {endMatchScores: endMatchScores, turnIndex: turnIndex, state: state};   
      }
      /**
       * Check if the box is surrounded
       */
      function boxOccupied(board: Board,row: number,col: number): boolean{
          return board[row-1][col].owner >=0 &&
          board[row+1][col].owner >=0 &&
          board[row][col-1].owner >=0 &&
          board[row][col+1].owner >=0
      }
      /**
       * Find out who wins
       */
      function getWinner(board: Board): number{       
        let count:number[]=[0,0];
        let dim=board.length;
        for(let i=0;i<dim;i++){
            for(let j=0;j<dim;j++){
                if(board[i][j].shape==Shape.Box){
                    count[board[i][j].owner]++;
                }            
            }
        }
        let maxCount=0;
        let winner:number;
        
        if(count[0]>count[1]){
            return 0;
        }
         if(count[1]>count[0]){
            return 1;
        }
        //Ties
        return -1;
      }
      /**
       * Check for game termination
       */
      function isOver(board: Board){
        let dim=board.length;
        for (let i = 0; i < dim; i++) {       
            for (let j = 0; j < dim; j++) {
                if(board[i][j].shape!=Shape.Box){
                    continue;
                }
                if(board[i][j].owner==-1){
                    return false;
                }
            }
        }
        return true;
      }
      /**
       * 1-2 times (or more) allowed in a game for each player.
       * Once this attck is instantiated, a number of random edges/lines will be reset
       * (or one line will be reset),ie, if the edge had an owner, it will be erased. 
       * And all the adjcent squares will reset also.
       * @param row 
       * @param col 
       */
      export function throwAtomicBomb(stateBeforeMove: IState, row: number, col: number,  
          turnIndexBeforeMove: number):IMove{
        let board=stateBeforeMove.board
        let dim=board.length
        let l:{[id:number]: BoardDelta}={};
        let idx=0;
        for(let i=0;i<dim;i++){
            for(let j=0;j<dim;j++){
                if(board[i][j].shape!=Shape.Line){
                    continue;
                }
                if(board[i][j].owner==-1){
                    continue;
                }
                l[idx++]={row:i,col:j};
            }
        }
        let rand=Math.floor(Math.random() * (idx-1));
        let r=l[rand].row;
        let c=l[rand].col;

        //Reset the ownership of the line
        let boardAfterMove = angular.copy(board);
        boardAfterMove[r][c].owner=-1;
        //Reset the ownership of two regions adjacent to the line
        if(boardAfterMove[r][c].dir==Direction.Hor){
            if(r>0){
                boardAfterMove[r-1][c].owner=-1
            }
            if(r<dim-1){
                boardAfterMove[r+1][c].owner=-1
            }
        }else{
            if(c>0){
                boardAfterMove[r][c-1].owner=-1
            }
            if(c<dim-1){
                boardAfterMove[r][c+1].owner=-1
            }
        }
        let turnIndex=turnIndexBeforeMove^1;
        let delta: BoardDelta = {row: r, col: c};
        let state: IState = {board: boardAfterMove, delta: delta};

        return {endMatchScores: null, turnIndex: turnIndex, state: state}; 
        
      }

      export function createInitialMove(row:number,col:number): IMove {
        return {endMatchScores: null, turnIndex: 0, 
        state: getInitialStateWP(row,col)};  
      }

      export function forSimpleTestHtml() {
        var move = gameLogic.createMove(null, 0, 1,  
          0);
        log.log("move=", move);
      }
}
