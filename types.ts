export enum Move {
  Rock = 'ROCK',
  Paper = 'PAPER',
  Scissors = 'SCISSORS'
}

export enum GameResult {
  Win = 'WIN',
  Lose = 'LOSE',
  Draw = 'DRAW'
}

export interface ScoreState {
  player: number;
  cpu: number;
}