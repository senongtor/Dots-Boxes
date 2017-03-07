/**
 * 4 Direction for each grid
 */
enum Direction {
    Hor = 1,
    Ver,
}
enum Shape { 
    Dot = 1,
    Box,
    Line,
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
  //To inducate the occupied grid
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
        // this.shape=Shape.Init;
        // this.dir=Direction.Init;
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
      export const ROWS = 15;
      export const COLS = 15;
      /**
       * Private method for initiating the board with the size we need
       */
      function createNewBoard(row: number, col: number): Board {
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
      export function getInitialBoard(): Board {
        return createNewBoard(ROWS,COLS);
      }
      export function getInitialState(): IState {
        return {board: getInitialBoard(), delta: null};
      }
      
      /**
       * Create Move
       */
      export function createMove(
          stateBeforeMove: IState, row: number, col: number,  
          turnIndexBeforeMove: number):IMove{
        if (!stateBeforeMove) {
            stateBeforeMove = getInitialState();
        }
        let board: Board = stateBeforeMove.board;
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
                //boardAfterMove[row-1][col].occupies[Occupied.Down]=true;
                if(boxOccupied(boardAfterMove,row-1,col)){
                    boardAfterMove[row-1][col].owner=turnIndexBeforeMove;
                    turnIndex=turnIndexBeforeMove;
                    streak=true;
                }
            }
            if(row<ROWS-1){
                //boardAfterMove[row+1][col].occupies[Occupied.Up]=true;
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
                //boardAfterMove[row][col-1].occupies[Occupied.Right]=true;
                if(boxOccupied(boardAfterMove,row,col-1)){
                    boardAfterMove[row][col-1].owner=turnIndexBeforeMove;
                    turnIndex=turnIndexBeforeMove;
                    streak=true;
                }else{
                    
                }
            }
            //If the line has right box.
            if(col<COLS-1){
                //boardAfterMove[row][col+1].occupies[Occupied.Left]=true;
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

        // let winner = getWinner(boardAfterMove);
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
        // return grid.occupies[Occupied.Down]&&
        // grid.occupies[Occupied.Up]&&
        // grid.occupies[Occupied.Left]&&
        // grid.occupies[Occupied.Right];
      }
      /**
       * Find out who wins
       */
      function getWinner(board: Board): number{       
        let count:number[];
        for(let i=0;i<ROWS;i++){
            for(let j=0;j<COLS;j++){
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
        return -1;
      }
      /**
       * Check for game termination
       */
      function isOver(board: Board){
        for (let i = 0; i < ROWS; i++) {       
            for (let j = 0; j < COLS; j++) {
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
      export function createInitialMove(): IMove {
        return {endMatchScores: null, turnIndex: 0, 
        state: getInitialState()};  
      }

      export function forSimpleTestHtml() {
        var move = gameLogic.createMove(null, 0, 1,  
          0);
        log.log("move=", move);
      }
}
