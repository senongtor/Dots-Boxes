/**
 * 4 Direction for each grid
 */
enum Direction {
    Up = 1,
    Down,
    Left,
    Right
}

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
  continueMove: boolean;
}

import gameService = gamingPlatform.gameService;
import alphaBetaService = gamingPlatform.alphaBetaService;
import translate = gamingPlatform.translate;
import resizeGameAreaService = gamingPlatform.resizeGameAreaService;
import log = gamingPlatform.log;
import dragAndDropService = gamingPlatform.dragAndDropService;

module gameLogic {
      
      export function getInitialBoard(len: number): Board {
        let board: Board = [];
        for (let i = 0; i < len; i++) {
            board[i] = [];
            for (let j = 0; j < len; j++) {
                board[i][j]=new Grid();
            }
        }
        return board;
      }
      export function getInitialState(len: number): IState {
        return {board: getInitialBoard(len), delta: null, continueMove: false};
      }
      /**
       * Create Move
       */
      export function createMove(
          stateBeforeMove: IState, row: number, col: number, d: Direction, 
          turnIndexBeforeMove: number, continueMove: boolean, len?:number):IMove{
        if (!stateBeforeMove) {
            stateBeforeMove = getInitialState(len);
        }
        let board: Board = stateBeforeMove.board;
        if(board[row][col].owner>0){
            throw new Error("No further move can be created because this square is already occupied");
        }
        if (isOver(board)) {
            throw new Error("Can only make a move if the game is not over!");
        }
        let boardAfterMove = angular.copy(board);
        let turnIndex: number;
        if(board[row][col].directions[d]){
            throw new Error("No further move can be created because this edge is already occupied");
        }
        boardAfterMove[row][col].directions[d] = true;
        //If all 4 edges of this grid is occupied, 
        //assign the current move player as the owner
        if(board[row][col].directions[Direction.Up]&&
        board[row][col].directions[Direction.Down]&&
        board[row][col].directions[Direction.Left]&&
        board[row][col].directions[Direction.Right]){
            //If I came from a moves from the opponent
            if(!continueMove){
                turnIndex=turnIndexBeforeMove^1;
                continueMove=true;
            }else{
                turnIndex=turnIndexBeforeMove;
            }
            //If I came from a move which succeeded, I should keep the turnindex.
            board[row][col].owner=turnIndex;
        }else{
            continueMove=false;
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
        }
        
        let delta: BoardDelta = {row: row, col: col, direction: d};
        let state: IState = {delta: delta, board: boardAfterMove};
        return {endMatchScores: endMatchScores, turnIndex: turnIndex, state: state};   
      }
      function getWinner(board: Board): number{       
        let count:number[];
        for(let i=0;i<board.length;i++){
            for(let j=0;j<board.length;j++){
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
        for (let i = 0; i < board.length; i++) {       
            for (let j = 0; j < board.length; j++) {
                if(board[i][j].owner==-1){
                    return false;
                }
            }
        }
        return true;
      }
}
