enum Direction {
    Up = 1,
    Down,
    Left,
    Right
}
class Grid{
    directions: {};
    owner: string;
    constructor(){
        this.directions={Up: false, Down: false,Left: false, Right: false};
        this.owner='';
    }
}

type Board = Grid[][];
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
      /**
       * Create Move
       */
      export function createMove(row: number, col: number, d: Direction, board:Board, player: string){
        if(isOver(board)){
            console.log(getWinner(board));
        }
        if(board[row][col].owner){
            throw new Error("No further move can be created because this square is already occupied");
        }
        if(board[row][col].directions[d]){
            throw new Error("No further move can be created because this edge is already occupied");
        }
        //If this grid is occupied, assign the current move player as the owner
        if(board[row][col].directions[Direction.Up]&&
        board[row][col].directions[Direction.Down]&&
        board[row][col].directions[Direction.Left]&&
        board[row][col].directions[Direction.Right]){
            board[row][col].owner=player;
        }
        if(isOver(board)){
            console.log(getWinner(board));
        }
      }
      function getWinner(board: Board): string{
        let count={};
        for(let i=0;i<board.length;i++){
            for(let j=0;j<board.length;j++){
                count[board[i][j].owner]++;
            }
        }
        let maxCount=0;
        let winner='';
        for (let owner in count){
            if(count[owner]>maxCount){
                winner=owner;
            }
        }
        if(!winner){
            throw new Error("No one wins??");
        }
        return winner;
      }
      /**
       * Check for game termination
       */
      function isOver(board: Board){
        for (let i = 0; i < board.length; i++) {       
            for (let j = 0; j < board.length; j++) {
                if(board[i][j].owner==''){
                    return false;
                }
            }
        }
        return true;
      }
}
