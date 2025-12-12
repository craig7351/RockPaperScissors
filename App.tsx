import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Move, GameResult, ScoreState } from './types';
import { MoveButton } from './components/MoveButton';
import { db } from './firebase';
import { doc, onSnapshot, updateDoc, setDoc, increment } from 'firebase/firestore';

const INTRO_IMAGE_URL = "https://storage.googleapis.com/stone7351/image/1.jpg";

const VIDEO_1_URL = "https://storage.googleapis.com/stone7351/video/1.mp4";
const VIDEO_2_URL = "https://storage.googleapis.com/stone7351/video/2.mp4";
const VIDEO_3_URL = "https://storage.googleapis.com/stone7351/video/3.mp4";
const VIDEO_4_URL = "https://storage.googleapis.com/stone7351/video/4.mp4";
const VIDEO_5_URL = "https://storage.googleapis.com/stone7351/video/5.mp4";
const VIDEO_6_URL = "https://storage.googleapis.com/stone7351/video/6.mp4";
const VIDEO_7_URL = "https://storage.googleapis.com/stone7351/video/7.mp4";

// Galgame Script
const INTRO_SCRIPT = [
  "學長... 你終於來了...",
  "人家在這裡等你好久了呢 (臉紅)",
  "那個... 雖然有點突然...",
  "今天，我想跟學長玩個遊戲...",
  "如果學長贏了...",
  "學妹什麼都聽你的喔... ///",
  "準備好了嗎？ 要開始囉！"
];

const App: React.FC = () => {
  // Game Phase State: 'title' | 'intro' | 'main'
  const [gamePhase, setGamePhase] = useState<'title' | 'intro' | 'main'>('title');
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');

  // Main Game State
  const [currentRound, setCurrentRound] = useState<number>(1); // 1, 2, 3...
  const [score, setScore] = useState<ScoreState>({ player: 0, cpu: 0 });
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [cpuMove, setCpuMove] = useState<Move | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Video & Event State
  const [hasSeenVideo, setHasSeenVideo] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>(VIDEO_1_URL);
  const [showHandOverlay, setShowHandOverlay] = useState(false);
  const [showPunishmentUI, setShowPunishmentUI] = useState(false);
  const [showNextRoundUI, setShowNextRoundUI] = useState(false);

  // Ending Sequence State
  const [showPaywall, setShowPaywall] = useState(false);
  const [showRefusePay, setShowRefusePay] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showFinalScreen, setShowFinalScreen] = useState(false);

  // Global Stats State
  const [globalStats, setGlobalStats] = useState({ totalGames: 0, cpuWins: 0, visitorCount: 0 });
  
  const resetTimerRef = useRef<number | null>(null);
  const hasIncrementedVisit = useRef(false);
  const typewriterRef = useRef<number | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);

  // Background blobs for aesthetic
  const blobs = [
    { color: 'bg-pink-300', top: '-10%', left: '-10%', size: 'w-72 h-72' },
    { color: 'bg-blue-300', bottom: '-10%', right: '-10%', size: 'w-80 h-80' },
    { color: 'bg-yellow-200', top: '40%', left: '30%', size: 'w-64 h-64' },
  ];

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
      if (voiceRef.current) voiceRef.current.pause();
    };
  }, []);

  // Galgame Typewriter Effect
  useEffect(() => {
    if (gamePhase !== 'intro') return;

    const fullText = INTRO_SCRIPT[dialogueIndex];
    setDisplayedText('');
    let charIndex = 0;

    const typeChar = () => {
      if (charIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, charIndex + 1));
        charIndex++;
        typewriterRef.current = window.setTimeout(typeChar, 50); // Typing speed
      }
    };

    typeChar();

    return () => {
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
    };
  }, [dialogueIndex, gamePhase]);

  // Galgame Voice Playback
  useEffect(() => {
    if (gamePhase === 'intro') {
        // Stop previous audio
        if (voiceRef.current) {
            voiceRef.current.pause();
            voiceRef.current.currentTime = 0;
        }

        // Play new audio based on index (01.mp3, 02.mp3...)
        const audioIndex = dialogueIndex + 1;
        const formattedIndex = audioIndex.toString().padStart(2, '0');
        const audioUrl = `https://storage.googleapis.com/stone7351/mp3/${formattedIndex}.mp3`;
        
        console.log(`[Voice Debug] Index: ${dialogueIndex}, Audio File: ${formattedIndex}.mp3`);
        console.log(`[Voice Debug] Attempting to play URL: ${audioUrl}`);

        const audio = new Audio(audioUrl);
        voiceRef.current = audio;
        
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log(`[Voice Debug] Success! Playing ${formattedIndex}.mp3`);
                })
                .catch(err => {
                    console.error(`[Voice Debug] Failed to play ${formattedIndex}.mp3:`, err);
                    if (err.name === 'NotAllowedError') {
                        console.warn("[Voice Debug] NOTE: Browser blocked autoplay. User must interact (click) with the page first.");
                    }
                });
        }
    } else {
        // Cleanup when leaving intro
        if (voiceRef.current) {
            voiceRef.current.pause();
        }
    }
  }, [dialogueIndex, gamePhase]);

  // Handle Credits Timer
  useEffect(() => {
    if (showCredits) {
      const timer = setTimeout(() => {
        setShowCredits(false);
        setShowFinalScreen(true);
      }, 5000); // 5 seconds scrolling
      return () => clearTimeout(timer);
    }
  }, [showCredits]);

  // Record Visitor (Increment on Mount)
  useEffect(() => {
    if (hasIncrementedVisit.current) return;
    hasIncrementedVisit.current = true;

    const incrementVisit = async () => {
         const statsDocRef = doc(db, 'RockPaper_Stats', 'summary');
         try {
             await updateDoc(statsDocRef, { visitorCount: increment(1) });
         } catch (e: any) {
             if (e.code === 'not-found') {
                 // Create if doesn't exist
                 try {
                    await setDoc(statsDocRef, { visitorCount: 1, totalGames: 0, cpuWins: 0 });
                 } catch (err) {
                    console.warn("Failed to create stats doc on visit:", err);
                 }
             } else {
                 console.warn("Failed to increment visitor count:", e);
             }
         }
    };
    incrementVisit();
  }, []);

  // Firebase Global Stats Subscription
  useEffect(() => {
    const statsDocRef = doc(db, 'RockPaper_Stats', 'summary');
    const unsubscribe = onSnapshot(
      statsDocRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGlobalStats({
              totalGames: data.totalGames || 0,
              cpuWins: data.cpuWins || 0,
              visitorCount: data.visitorCount || 0
          });
        } else {
          // Initialize if missing
          setDoc(statsDocRef, { totalGames: 0, cpuWins: 0, visitorCount: 1 }).catch(err => {
             console.warn("Failed to initialize stats (likely permission issue):", err);
          });
        }
      },
      (error) => {
        console.warn("Firebase stats subscription error (likely permission issue):", error.message);
      }
    );
    return () => unsubscribe();
  }, []);

  const updateGlobalStats = async (gameResult: GameResult) => {
    const statsDocRef = doc(db, 'RockPaper_Stats', 'summary');
    const updates: any = {
      totalGames: increment(1)
    };
    // Player Lose = CPU Win
    if (gameResult === GameResult.Lose) { 
      updates.cpuWins = increment(1);
    }
    
    try {
        await updateDoc(statsDocRef, updates);
    } catch (e: any) {
        // Error handling already covered in logic or swallowed if transient
        console.warn("Failed to update game stats:", e);
    }
  };

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
    if (isAnimating || showVideo || showPunishmentUI || showNextRoundUI || showPaywall || showCredits || showFinalScreen) return;

    // Clear any pending reset
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    setPlayerMove(move);
    setCpuMove(null);
    setResult(null);
    setShowConfetti(false);

    // ROUND 1 SPECIAL LOGIC: Rock Wins triggers video
    if (currentRound === 1 && move === Move.Rock && !hasSeenVideo) {
      setCurrentVideoUrl(VIDEO_1_URL);
      setShowVideo(true);
      setShowHandOverlay(false);
      return; 
    }

    // ROUND 2 SPECIAL LOGIC: Paper Wins triggers video
    if (currentRound === 2 && move === Move.Paper && !hasSeenVideo) {
      setCurrentVideoUrl(VIDEO_3_URL);
      setShowVideo(true);
      setShowHandOverlay(false);
      return;
    }

    // ROUND 3 SPECIAL LOGIC: Rock Wins triggers video
    if (currentRound === 3 && move === Move.Rock && !hasSeenVideo) {
      setCurrentVideoUrl(VIDEO_5_URL);
      setShowVideo(true);
      setShowHandOverlay(false);
      return;
    }

    // NORMAL LOGIC (Which forces loss for R1-R3 if special move wasn't picked)
    setIsAnimating(true);
    
    // Simulate "thinking" time
    setTimeout(() => {
      let cMove: Move;
      let gameResult: GameResult;
      
      // Algorithm: For Rounds 1-3, if the user didn't pick the winning move (caught above),
      // the CPU MUST play the counter move to ensure the user loses.
      if (currentRound <= 3) {
          if (move === Move.Rock) {
              cMove = Move.Paper;
          } else if (move === Move.Paper) {
              cMove = Move.Scissors;
          } else {
              cMove = Move.Rock; // Scissors -> Rock
          }
      } else {
          // Random logic for any potential future rounds
          const moves = [Move.Rock, Move.Paper, Move.Scissors];
          cMove = moves[Math.floor(Math.random() * moves.length)];
      }

      setCpuMove(cMove);
      gameResult = determineWinner(move, cMove);
      setResult(gameResult);

      if (gameResult === GameResult.Win) {
        setScore((prev) => ({ ...prev, player: prev.player + 1 }));
        setShowConfetti(true);
      } else if (gameResult === GameResult.Lose) {
        setScore((prev) => ({ ...prev, cpu: prev.cpu + 1 }));
      }

      // Update Firebase
      updateGlobalStats(gameResult);

      setIsAnimating(false);
    }, 1000); 
  };

  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    // Show hand overlay in the last 1 second for the "Reveal" videos (1, 3, 5)
    if (currentVideoUrl === VIDEO_1_URL || currentVideoUrl === VIDEO_3_URL || currentVideoUrl === VIDEO_5_URL) {
        if (video.duration && video.currentTime > video.duration - 1) {
            if (!showHandOverlay) setShowHandOverlay(true);
        }
    }
  };

  const handleVideoEnded = () => {
    setShowVideo(false);

    if (currentVideoUrl === VIDEO_1_URL) {
        // Round 1 Reveal Ended -> Punishment
        setShowPunishmentUI(true);
    } else if (currentVideoUrl === VIDEO_2_URL) {
        // Round 1 Punishment Ended -> Next Round
        setShowNextRoundUI(true);
    } else if (currentVideoUrl === VIDEO_3_URL) {
        // Round 2 Reveal Ended -> Punishment
        setShowPunishmentUI(true);
    } else if (currentVideoUrl === VIDEO_4_URL) {
        // Round 2 Punishment Ended -> Next Round
        setShowNextRoundUI(true);
    } else if (currentVideoUrl === VIDEO_5_URL) {
        // Round 3 Reveal Ended -> Punishment
        setShowPunishmentUI(true);
    } else if (currentVideoUrl === VIDEO_6_URL) {
        // Round 3 Punishment Ended -> Paywall
        setShowPaywall(true);
    } else if (currentVideoUrl === VIDEO_7_URL) {
        // Final Video Ended -> Credits
        setShowCredits(true);
    } else {
        // Fallback
        resetGame();
    }
  };

  const handleAcceptPunishment = () => {
      setShowPunishmentUI(false);
      
      if (currentRound === 1) setCurrentVideoUrl(VIDEO_2_URL);
      else if (currentRound === 2) setCurrentVideoUrl(VIDEO_4_URL);
      else if (currentRound === 3) setCurrentVideoUrl(VIDEO_6_URL);
      
      setShowVideo(true);
      setShowHandOverlay(false);
  };

  const handleNextRound = () => {
    setScore((prev) => ({ ...prev, player: prev.player + 1 }));
    setCurrentRound(prev => prev + 1);
    setHasSeenVideo(false); 
    setShowNextRoundUI(false);
    resetGame();
  };

  const handleFakePay = () => {
      // User clicked "Continue please pay", show the refusal button
      setShowRefusePay(true);
  };

  const handleRefusePay = () => {
      // User clicked "I won't pay", play final video
      setShowPaywall(false);
      setShowRefusePay(false);
      setCurrentVideoUrl(VIDEO_7_URL);
      setShowVideo(true);
      setShowHandOverlay(false);
  };

  const handleStartGame = () => {
      setGamePhase('intro');
  };

  const handleFullReset = () => {
      setGamePhase('title');
      setDialogueIndex(0);
      setDisplayedText('');
      setCurrentRound(1);
      setScore({ player: 0, cpu: 0 });
      setHasSeenVideo(false);
      setShowFinalScreen(false);
      resetGame();
  };

  const resetGame = () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setPlayerMove(null);
    setCpuMove(null);
    setResult(null);
    setShowConfetti(false);
    setShowPunishmentUI(false);
    setShowNextRoundUI(false);
    // Don't reset ending states here, handled by handleFullReset
  };

  const handleIntroClick = () => {
      if (dialogueIndex < INTRO_SCRIPT.length - 1) {
          // If text hasn't finished typing, finish it instantly
          const fullText = INTRO_SCRIPT[dialogueIndex];
          if (displayedText !== fullText) {
              if (typewriterRef.current) clearTimeout(typewriterRef.current);
              setDisplayedText(fullText);
          } else {
              setDialogueIndex(prev => prev + 1);
          }
      } else {
          // Transition to Main Game
          setGamePhase('main');
      }
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

  const getRoundTitle = () => {
      if (currentRound === 1) return "我的學妹真可愛";
      if (currentRound === 2) return "第二局：只有一種會贏？";
      if (currentRound === 3) return "第三局：只有一種會贏！";
      return `第 ${currentRound} 局`;
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

      {/* Global Stats Badge - Single Row Layout (Only show in Game Phase) */}
      {gamePhase === 'main' && (
        <div className="absolute top-4 left-4 z-20 bg-white/60 backdrop-blur-md border border-white/40 px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all animate-fadeIn">
            <div className="flex items-center gap-3 text-xs sm:text-sm">
               <div className="flex items-center gap-1 font-bold text-slate-700">
                   <span>🌍</span>
                   <span className="hidden sm:inline">全球統計</span>
               </div>
               <div className="w-px h-3 bg-slate-400/50"></div>
               <div className="flex items-center gap-1">
                  <span className="text-slate-500">幾個學長</span>
                  <span className="text-pink-600 font-bold">{globalStats.visitorCount.toLocaleString()}</span>
               </div>
               <div className="w-px h-3 bg-slate-400/50"></div>
               <div className="flex items-center gap-1">
                  <span className="text-slate-500">學妹勝場</span>
                  <span className="text-indigo-600 font-bold">{globalStats.cpuWins.toLocaleString()}</span>
               </div>
            </div>
        </div>
      )}

      {/* 
        ================================================================
        TITLE SCREEN
        ================================================================
      */}
      {gamePhase === 'title' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/30 backdrop-blur-sm animate-fadeIn">
            <div className="relative z-10 text-center p-8 rounded-3xl">
                <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400 mb-12 drop-shadow-sm text-center leading-tight tracking-tight">
                    我的學妹<br/>真可愛
                </h1>
                
                <button
                    onClick={handleStartGame}
                    className="
                        px-12 py-6 rounded-full bg-slate-800 text-white font-bold text-2xl tracking-widest
                        shadow-[0_0_20px_rgba(236,72,153,0.5)] border-4 border-transparent
                        hover:scale-110 hover:bg-slate-700 hover:shadow-[0_0_30px_rgba(236,72,153,0.8)]
                        active:scale-95 transition-all duration-300
                        animate-bounce
                    "
                >
                    遊戲開始
                </button>
                <p className="mt-12 text-slate-500 font-medium text-sm animate-pulse">請開啟音效以獲得最佳體驗 🔊</p>
            </div>
        </div>
      )}

      {/* 
        ================================================================
        INTRO PHASE (Galgame Mode)
        ================================================================
      */}
      {gamePhase === 'intro' && (
        <div 
            onClick={handleIntroClick}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-pink-50/50 cursor-pointer animate-fadeIn"
        >
            <div className="relative w-full max-w-md h-[80vh] bg-white rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                {/* Character Image */}
                <div className="absolute inset-0 bg-gray-100">
                    <img 
                        src={INTRO_IMAGE_URL} 
                        alt="Cute Junior" 
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Gradient Overlay for text readability */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

                {/* Dialogue Box */}
                <div className="absolute bottom-6 left-4 right-4 bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg border-2 border-pink-100 min-h-[140px] flex flex-col justify-start items-start">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">學妹</span>
                    </div>
                    <p className="text-slate-800 text-lg font-medium leading-relaxed">
                        {displayedText}
                        <span className="animate-pulse inline-block ml-1">_</span>
                    </p>
                    <div className="absolute bottom-4 right-4 text-slate-400 text-xs animate-bounce">
                        點擊繼續 ▼
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 
        ================================================================
        MAIN GAME PHASE
        ================================================================
      */}
      {gamePhase === 'main' && (
      <div className="bg-white/80 backdrop-blur-lg rounded-[3rem] shadow-2xl p-6 sm:p-10 w-full max-w-2xl border border-white/50 relative z-10 flex flex-col items-center animate-fadeIn">
        
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 mb-2">
            {getRoundTitle()}
          </h1>
          <p className="text-slate-500 font-medium">今天誰會贏呢？</p>
        </header>

        {/* Score Board */}
        <div className="flex gap-4 sm:gap-12 mb-10 w-full justify-center">
          <div className="flex flex-col items-center bg-pink-100/50 p-4 rounded-2xl w-32 border-2 border-pink-100">
            <span className="text-sm font-bold text-pink-400 uppercase tracking-wider">學長</span>
            <span className="text-4xl font-black text-pink-600 mt-1">{score.player}</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-300">VS</span>
          </div>
          <div className="flex flex-col items-center bg-indigo-100/50 p-4 rounded-2xl w-32 border-2 border-indigo-100">
            <span className="text-sm font-bold text-indigo-400 uppercase tracking-wider">學妹</span>
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
                  <span className="text-xs text-slate-400 font-bold mb-2">學妹出了</span>
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
                {result === GameResult.Win && playerMove === Move.Rock && currentRound === 1 && (
                  <p className="text-pink-300 text-sm font-medium mt-2">✨ 拳頭最強！ ✨</p>
                )}
                {result === GameResult.Win && playerMove === Move.Paper && currentRound === 2 && (
                    <p className="text-pink-300 text-sm font-medium mt-2">✨ 布最強！ ✨</p>
                )}
                {result === GameResult.Win && playerMove === Move.Rock && currentRound === 3 && (
                    <p className="text-pink-300 text-sm font-medium mt-2">✨ 終極拳頭！ ✨</p>
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
      )}

      {/* Video Popup Overlay - Cinema Mode */}
      {showVideo && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn">
            {/* Video Player */}
            <div className="w-full h-full flex items-center justify-center p-4 relative">
                <video 
                    src={currentVideoUrl}
                    controls={false}
                    autoPlay 
                    onTimeUpdate={handleVideoTimeUpdate}
                    onEnded={handleVideoEnded}
                    playsInline
                    className="max-w-full max-h-[85vh] w-auto h-auto shadow-[0_0_100px_rgba(236,72,153,0.3)] rounded-lg"
                />
                
                {/* Hand Overlay - Only for Reveal videos (1, 3, 5) in last 1 second */}
                {showHandOverlay && (currentVideoUrl === VIDEO_1_URL || currentVideoUrl === VIDEO_3_URL || currentVideoUrl === VIDEO_5_URL) && (
                    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                         <div className="
                            text-[10rem] sm:text-[15rem] 
                            filter drop-shadow-[0_0_50px_rgba(255,255,255,0.8)] 
                            animate-punch
                            transform origin-bottom
                         ">
                            {currentVideoUrl === VIDEO_3_URL ? '✋' : '✊'}
                         </div>
                    </div>
                )}
            </div>
            
            <p className="absolute bottom-12 text-white/50 font-medium tracking-widest text-sm animate-pulse">
                {(currentVideoUrl === VIDEO_1_URL || currentVideoUrl === VIDEO_3_URL || currentVideoUrl === VIDEO_5_URL) ? "對手出招中..." : "接受處罰中..."}
            </p>
        </div>
      )}

      {/* Punishment Button Modal */}
      {showPunishmentUI && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="scale-150 animate-bounce mb-8 text-6xl">😈</div>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-12 drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]">
               學妹妳輸了!
            </h2>
            <button 
                onClick={handleAcceptPunishment}
                className="
                  px-12 py-6 rounded-full bg-gradient-to-r from-red-600 to-rose-600 
                  text-white font-black text-2xl tracking-widest
                  shadow-[0_0_40px_rgba(220,38,38,0.6)] 
                  hover:scale-110 hover:shadow-[0_0_60px_rgba(220,38,38,0.8)]
                  active:scale-95 transition-all duration-200
                  animate-pulse
                "
            >
                接受處罰吧!
            </button>
        </div>
      )}

      {/* Next Round Modal */}
      {showNextRoundUI && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="scale-150 animate-bounce mb-8 text-6xl">✨</div>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-12 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
               太精彩了!
            </h2>
            <button 
                onClick={handleNextRound}
                className="
                  px-12 py-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 
                  text-white font-black text-2xl tracking-widest
                  shadow-[0_0_40px_rgba(79,70,229,0.6)] 
                  hover:scale-110 hover:shadow-[0_0_60px_rgba(79,70,229,0.8)]
                  active:scale-95 transition-all duration-200
                  animate-pulse
                "
            >
                準備下一局!
            </button>
        </div>
      )}

      {/* Paywall UI */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="text-6xl mb-4">💰</div>
            <h2 className="text-3xl font-bold text-white mb-8">觀看更多內容</h2>
            
            {!showRefusePay ? (
                <button 
                    onClick={handleFakePay}
                    className="
                      px-10 py-5 rounded-xl bg-yellow-500 text-yellow-900 font-black text-xl 
                      shadow-[0_6px_0_rgb(161,98,7)] active:shadow-none active:translate-y-1
                      transition-all hover:bg-yellow-400
                    "
                >
                    繼續請課金
                </button>
            ) : (
                <button 
                    onClick={handleRefusePay}
                    className="
                      px-10 py-5 rounded-xl bg-slate-200 text-slate-800 font-black text-xl 
                      shadow-[0_6px_0_rgb(100,116,139)] active:shadow-none active:translate-y-1
                      transition-all hover:bg-white animate-bounce
                    "
                >
                    我才不課金,快繼續
                </button>
            )}
        </div>
      )}

      {/* Rolling Credits */}
      {showCredits && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-end overflow-hidden">
            <div className="w-full text-center animate-credits text-white space-y-8 pb-20">
                <div className="space-y-2">
                    <p className="text-slate-400 text-sm uppercase tracking-widest">導演</p>
                    <p className="text-2xl font-bold">BOOK</p>
                </div>
                <div className="space-y-2">
                    <p className="text-slate-400 text-sm uppercase tracking-widest">編劇</p>
                    <p className="text-2xl font-bold">BOOK</p>
                </div>
                <div className="space-y-2">
                    <p className="text-slate-400 text-sm uppercase tracking-widest">後製</p>
                    <p className="text-2xl font-bold">GROK / Google AI Studio</p>
                </div>
                <div className="space-y-2">
                    <p className="text-slate-400 text-sm uppercase tracking-widest">演員</p>
                    <p className="text-2xl font-bold">學妹</p>
                </div>
                <div className="space-y-2">
                    <p className="text-slate-400 text-sm uppercase tracking-widest">男演員</p>
                    <p className="text-2xl font-bold">隔壁老王</p>
                </div>
                <div className="pt-10 text-4xl">🎬</div>
            </div>
        </div>
      )}

      {/* Final Screen */}
      {showFinalScreen && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 text-white animate-fadeIn p-4 text-center">
             <h1 className="text-5xl md:text-6xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                遊戲結束
             </h1>
             <p className="text-2xl text-slate-300 mb-2">謝謝支持</p>
             <p className="text-lg text-pink-400 mb-12 font-bold animate-pulse">
                👍 有1000個讚, 就出2代
             </p>
             
             <button
                onClick={handleFullReset}
                className="
                  px-8 py-4 rounded-full border-2 border-white/20 hover:border-white 
                  text-white/80 hover:text-white font-bold text-lg
                  transition-all duration-300 hover:bg-white/10
                "
              >
                重新再來一次
              </button>
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
        @keyframes punch {
            0% { transform: scale(0.5) translateY(100px); opacity: 0; }
            50% { transform: scale(1.2) translateY(-20px); opacity: 1; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-punch {
            animation: punch 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes creditsScroll {
            0% { transform: translateY(100%); }
            100% { transform: translateY(-100%); }
        }
        .animate-credits {
            animation: creditsScroll 5s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default App;