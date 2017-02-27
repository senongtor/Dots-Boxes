/**
 * 4 Direction for each grid
 */
enum Direction {
    Up = 1,
    Down,
    Left,
    Right
}
type IProposalData = BoardDelta;
interface BoardDelta {
  row: number;
  col: number;
  direction: Direction;
}

/**
 * Grid that will model the region 
 */
class Grid{
    directions: { [id: number] : boolean; } = {};
    owner: number;
    piece: string;
    constructor(){
        this.directions[Direction.Up]=false;
        this.directions[Direction.Down]=false;
        this.directions[Direction.Left]=false;
        this.directions[Direction.Right]=false;
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
      export const ROWS = 5;
      export const COLS = 4;
      export function getInitialBoard(): Board {
        let board: Board = [];
        for (let i = 0; i < ROWS; i++) {
            board[i] = [];
            for (let j = 0; j < COLS; j++) {
                board[i][j]=new Grid();
                board[i][j].owner=-1;
            }
        }
        return board;
      }
      export function getInitialState(): IState {
        return {board: getInitialBoard(), delta: null};
      }
      /**
       * Create Move
       */
      export function createMove(
          stateBeforeMove: IState, row: number, col: number, d: Direction, 
          turnIndexBeforeMove: number):IMove{
        if (!stateBeforeMove) {
            stateBeforeMove = getInitialState();
        }
        let board: Board = stateBeforeMove.board;
        if (isOver(board)) {
            throw new Error("Can only make a move if the game is not over!");
        }
        if(board[row][col].owner>0){
            throw new Error("No further move can be created because this square is already occupied");
        }
        if(board[row][col].directions[d]){
            throw new Error("No further move can be created because this edge is already occupied");
        }
        
        let boardAfterMove = angular.copy(board);
        let turnIndex: number;
        
        boardAfterMove[row][col].directions[d] = true;
        //If all 4 edges of this grid is occupied, 
        //assign the current move player as the owner
        if(board[row][col].directions[Direction.Up]&&
        board[row][col].directions[Direction.Down]&&
        board[row][col].directions[Direction.Left]&&
        board[row][col].directions[Direction.Right]){  
            board[row][col].owner=turnIndexBeforeMove;        
            turnIndex=turnIndexBeforeMove;
        }else{
            turnIndex=turnIndexBeforeMove^1;
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
        
        let delta: BoardDelta = {row: row, col: col, direction: d};
        let state: IState = {board: boardAfterMove, delta: delta};
        return {endMatchScores: endMatchScores, turnIndex: turnIndex, state: state};   
      }
      function getWinner(board: Board): number{       
        let count:number[];
        for(let i=0;i<ROWS;i++){
            for(let j=0;j<COLS;j++){
                count[board[i][j].owner]++;
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
        var move = gameLogic.createMove(null, 0, 0, Direction.Up, 
          0);
        log.log("move=", move);
      }
}
