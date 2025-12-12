import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Move, GameResult, ScoreState } from './types';
import { MoveButton } from './components/MoveButton';

const App: React.FC = () => {
  const [score, setScore] = useState<ScoreState>({ player: 0, cpu: 0 });
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [cpuMove, setCpuMove] = useState<Move | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Track if the special video has been shown
  const [hasSeenVideo, setHasSeenVideo] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Background blobs for aesthetic
  const blobs = [
    { color: 'bg-pink-300', top: '-10%', left: '-10%', size: 'w-72 h-72' },
    { color: 'bg-blue-300', bottom: '-10%', right: '-10%', size: 'w-80 h-80' },
    { color: 'bg-yellow-200', top: '40%', left: '30%', size: 'w-64 h-64' },
  ];

  const determineWinner = (pMove: Move, cMove: Move): GameResult => {
    if (pMove === cMove) return GameResult.Draw;
    if (
      (pMove === Move.Rock && cMove === Move.Scissors) ||
      (pMove === Move.Paper && cMove === Move.Rock) ||
      (pMove === Move.Scissors && cMove === Move.Paper)
    ) {
      return GameResult.Win;
    }
    return GameResult.Lose;
  };

  const handleMove = (move: Move) => {
    if (isAnimating || showVideo) return;

    setPlayerMove(move);
    setCpuMove(null);
    setResult(null);
    setShowConfetti(false);

    // SPECIAL LOGIC: If player chooses Rock and hasn't seen the video yet
    // Play the video FIRST, then show result after video ends.
    if (move === Move.Rock && !hasSeenVideo) {
      setShowVideo(true);
      return; // Stop here, wait for video to end
    }

    // NORMAL LOGIC
    setIsAnimating(true);
    
    // Simulate "thinking" time
    setTimeout(() => {
      let cMove: Move;

      if (move === Move.Rock) {
        // Rock always wins
        cMove = Move.Scissors;
      } else {
        // Random fair game
        const moves = [Move.Rock, Move.Paper, Move.Scissors];
        cMove = moves[Math.floor(Math.random() * moves.length)];
      }

      setCpuMove(cMove);
      const gameResult = determineWinner(move, cMove);
      setResult(gameResult);

      if (gameResult === GameResult.Win) {
        setScore((prev) => ({ ...prev, player: prev.player + 1 }));
        setShowConfetti(true);
      } else if (gameResult === GameResult.Lose) {
        setScore((prev) => ({ ...prev, cpu: prev.cpu + 1 }));
      }

      setIsAnimating(false);
    }, 1000); 
  };

  const handleVideoEnded = () => {
    // When video ends, we force the "Win" state for Rock vs Scissors
    setShowVideo(false);
    setHasSeenVideo(true); // Mark as seen so it doesn't play every time (optional, remove if you want it every time)
    
    // Set Game State to Win
    const cMove = Move.Scissors; // Video shows scissors
    setCpuMove(cMove);
    setResult(GameResult.Win);
    setScore((prev) => ({ ...prev, player: prev.player + 1 }));
    setShowConfetti(true);
  };

  const resetGame = () => {
    setPlayerMove(null);
    setCpuMove(null);
    setResult(null);
    setShowConfetti(false);
  };

  const getEmoji = (move: Move | null) => {
    switch (move) {
      case Move.Rock: return '✊';
      case Move.Paper: return '✋';
      case Move.Scissors: return '✌️';
      default: return '❔';
    }
  };

  const getResultText = (res: GameResult | null) => {
    switch (res) {
      case GameResult.Win: return '你贏了！ 🎉';
      case GameResult.Lose: return '哎呀，輸了 😢';
      case GameResult.Draw: return '平手！ 🤝';
      default: return '';
    }
  };

  const getResultColor = (res: GameResult | null) => {
    switch (res) {
      case GameResult.Win: return 'text-pink-500';
      case GameResult.Lose: return 'text-slate-500';
      case GameResult.Draw: return 'text-yellow-500';
      default: return 'text-slate-700';
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden">
      {/* Background Blobs */}
      {blobs.map((blob, index) => (
        <div
          key={index}
          className={`blob rounded-full mix-blend-multiply ${blob.color} ${blob.size} ${index % 2 === 0 ? 'animate-pulse' : ''}`}
          style={{ top: blob.top, left: blob.left, bottom: blob.bottom, right: blob.right }}
        />
      ))}

      {/* Main Card */}
      <div className="bg-white/80 backdrop-blur-lg rounded-[3rem] shadow-2xl p-6 sm:p-10 w-full max-w-2xl border border-white/50 relative z-10 flex flex-col items-center">
        
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 mb-2">
            超級可愛猜拳
          </h1>
          <p className="text-slate-500 font-medium">今天誰會贏呢？</p>
        </header>

        {/* Score Board */}
        <div className="flex gap-4 sm:gap-12 mb-10 w-full justify-center">
          <div className="flex flex-col items-center bg-pink-100/50 p-4 rounded-2xl w-32 border-2 border-pink-100">
            <span className="text-sm font-bold text-pink-400 uppercase tracking-wider">玩家</span>
            <span className="text-4xl font-black text-pink-600 mt-1">{score.player}</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-300">VS</span>
          </div>
          <div className="flex flex-col items-center bg-indigo-100/50 p-4 rounded-2xl w-32 border-2 border-indigo-100">
            <span className="text-sm font-bold text-indigo-400 uppercase tracking-wider">電腦</span>
            <span className="text-4xl font-black text-indigo-600 mt-1">{score.cpu}</span>
          </div>
        </div>

        {/* Game Area */}
        <div className="w-full flex flex-col items-center min-h-[300px]">
          
          {/* Playing Phase */}
          {!result && !isAnimating && (
            <div className="flex flex-col items-center animate-fadeIn w-full">
              <p className="text-lg text-slate-600 mb-6 font-bold">請出拳！</p>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                <MoveButton move={Move.Rock} onClick={handleMove} />
                <MoveButton move={Move.Paper} onClick={handleMove} />
                <MoveButton move={Move.Scissors} onClick={handleMove} />
              </div>
            </div>
          )}

          {/* Animation / Thinking Phase */}
          {isAnimating && (
            <div className="flex flex-col items-center justify-center py-10 animate-pulse">
              <div className="text-6xl mb-4 animate-bounce">🤔</div>
              <p className="text-slate-400 font-bold text-lg">對手正在思考...</p>
            </div>
          )}

          {/* Result Phase */}
          {result && !isAnimating && (
            <div className="flex flex-col items-center w-full animate-scaleIn">
              
              <div className="flex items-center justify-center gap-8 sm:gap-16 mb-8 w-full">
                {/* Player Choice */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-slate-400 font-bold mb-2">你出了</span>
                  <div className={`
                    w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-5xl sm:text-6xl bg-white shadow-lg border-4
                    ${result === GameResult.Win ? 'border-pink-300 ring-4 ring-pink-100' : 'border-slate-100'}
                  `}>
                    {getEmoji(playerMove)}
                  </div>
                </div>

                {/* VS Badge */}
                 <div className="font-black text-slate-200 text-xl italic">VS</div>

                {/* CPU Choice */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-slate-400 font-bold mb-2">電腦出了</span>
                  <div className={`
                    w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-5xl sm:text-6xl bg-white shadow-lg border-4
                    ${result === GameResult.Lose ? 'border-indigo-300 ring-4 ring-indigo-100' : 'border-slate-100'}
                  `}>
                    {getEmoji(cpuMove)}
                  </div>
                </div>
              </div>

              <div className="text-center mb-8">
                <h2 className={`text-4xl font-black mb-2 ${getResultColor(result)} drop-shadow-sm`}>
                  {getResultText(result)}
                </h2>
                {result === GameResult.Win && playerMove === Move.Rock && (
                  <p className="text-pink-300 text-sm font-medium mt-2">✨ 拳頭最強！ ✨</p>
                )}
              </div>

              <button
                onClick={resetGame}
                className="
                  px-8 py-3 rounded-full bg-slate-800 text-white font-bold text-lg
                  shadow-lg hover:bg-slate-700 hover:shadow-xl hover:-translate-y-1
                  active:translate-y-0 active:shadow-md transition-all duration-200
                  flex items-center gap-2
                "
              >
                <span>🔄</span> 再玩一次
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Video Popup Overlay - Cinema Mode */}
      {showVideo && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn">
            {/* Skip Button - Subtle */}
            <button 
                onClick={handleVideoEnded}
                className="absolute top-8 right-8 text-white/40 hover:text-white text-sm font-bold tracking-widest uppercase border border-white/20 hover:border-white px-4 py-2 rounded-full transition-all"
            >
                Skip ⏭
            </button>

            {/* Video Player - Full focus */}
            <div className="w-full h-full flex items-center justify-center p-4">
                <video 
                    src="https://storage.cloud.google.com/stone7351/video/1.mp4" 
                    controls={false}
                    autoPlay 
                    onEnded={handleVideoEnded}
                    playsInline
                    className="max-w-full max-h-[85vh] w-auto h-auto shadow-[0_0_100px_rgba(236,72,153,0.3)] rounded-lg"
                />
            </div>
            
            <p className="absolute bottom-12 text-white/50 font-medium tracking-widest text-sm animate-pulse">
                對手出招中...
            </p>
        </div>
      )}
      
      {/* Footer / Credits */}
      <footer className="absolute bottom-4 text-slate-400 text-xs font-medium opacity-60">
        Super Cute RPS • Made with ❤️
      </footer>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
           {[...Array(30)].map((_, i) => (
             <div 
               key={i}
               className="absolute text-2xl animate-fall"
               style={{
                 left: `${Math.random() * 100}%`,
                 top: `-10%`,
                 animationDuration: `${Math.random() * 2 + 2}s`,
                 animationDelay: `${Math.random() * 0.5}s`
               }}
             >
               {['🎉', '✨', '⭐', '💖'][Math.floor(Math.random() * 4)]}
             </div>
           ))}
        </div>
      )}
      
      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default App;