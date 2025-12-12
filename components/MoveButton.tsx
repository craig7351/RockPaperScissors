import React from 'react';
import { Move } from '../types';

interface MoveButtonProps {
  move: Move;
  onClick: (move: Move) => void;
  disabled?: boolean;
}

const MOVES_CONFIG = {
  [Move.Rock]: { emoji: '✊', label: '拳頭', color: 'bg-rose-100 hover:bg-rose-200 text-rose-600 border-rose-200' },
  [Move.Paper]: { emoji: '✋', label: '布', color: 'bg-blue-100 hover:bg-blue-200 text-blue-600 border-blue-200' },
  [Move.Scissors]: { emoji: '✌️', label: '剪刀', color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600 border-yellow-200' },
};

export const MoveButton: React.FC<MoveButtonProps> = ({ move, onClick, disabled }) => {
  const config = MOVES_CONFIG[move];

  return (
    <button
      onClick={() => onClick(move)}
      disabled={disabled}
      className={`
        group relative flex flex-col items-center justify-center 
        w-28 h-28 sm:w-36 sm:h-36 rounded-3xl 
        border-4 shadow-[0_8px_0_rgb(0,0,0,0.1)] active:shadow-none active:translate-y-2
        transition-all duration-200 ease-in-out
        ${config.color}
        ${disabled ? 'opacity-50 cursor-not-allowed transform-none' : 'hover:-translate-y-1'}
      `}
    >
      <span className="text-4xl sm:text-5xl mb-2 filter drop-shadow-sm group-hover:scale-110 transition-transform">
        {config.emoji}
      </span>
      <span className="font-bold text-sm sm:text-base tracking-wide">
        {config.label}
      </span>
    </button>
  );
};