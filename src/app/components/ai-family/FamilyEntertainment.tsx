/**
 * FamilyEntertainment.tsx
 * ========================
 * AI Family 文娱中心
 * 琴棋书画 · 对弈 · 才艺鉴赏 · 文化交流 · 海报广播
 *
 * "不要冷冰冰的文档模块" — 这里是有温度的家人互动空间
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Gamepad2, Palette, Music2, BookOpen, Trophy,
  Swords, Puzzle, Dice5, Crown,
  Image, Megaphone, Radio, Heart,
  Play, RotateCcw, Star, Sparkles,
  Clock,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import { FadeIn } from "./FadeIn";
import { FamilyPageHeader } from "./FamilyPageHeader";
import { FAMILY_MEMBERS, DEEP_BG, getHourlyCare, type FamilyMember } from "./shared";

// ═══ 五子棋逻辑 ═══
type Stone = "black" | "white" | null;
const BOARD_SIZE = 9; // 9x9 迷你棋盘

function createBoard(): Stone[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function checkWin(board: Stone[][], row: number, col: number, stone: Stone): boolean {
  if (!stone) return false;
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (let d = 1; d < 5; d++) {
      const r = row + dr * d, c = col + dc * d;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === stone) count++;
      else break;
    }
    for (let d = 1; d < 5; d++) {
      const r = row - dr * d, c = col - dc * d;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === stone) count++;
      else break;
    }
    if (count >= 5) return true;
  }
  return false;
}

// ═══ 主组件 ═══
export function FamilyEntertainment() {
  const [activeTab, setActiveTab] = useState<"games" | "art" | "broadcast">("games");
  const [gameType, setGameType] = useState<"gomoku" | null>(null);
  const [board, setBoard] = useState(createBoard);
  const [currentPlayer, setCurrentPlayer] = useState<"black" | "white">("black");
  const [winner, setWinner] = useState<string | null>(null);
  const [opponent] = useState<FamilyMember>(FAMILY_MEMBERS[1]); // 万物 — 擅长思考
  const [aiThinking, setAiThinking] = useState(false);

  // 整点关爱
  const care = useMemo(() => getHourlyCare(), []);

  // AI 落子
  const aiMove = useCallback((currentBoard: Stone[][]) => {
    setAiThinking(true);
    setTimeout(() => {
      const empty: [number, number][] = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (!currentBoard[r][c]) empty.push([r, c]);
        }
      }
      if (empty.length === 0) { setAiThinking(false); return; }

      // 简单策略：优先靠近已有棋子
      let best: [number, number] = empty[Math.floor(Math.random() * empty.length)];
      let bestScore = -1;
      for (const [r, c] of empty) {
        let score = 0;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && currentBoard[nr][nc]) {
              score += currentBoard[nr][nc] === "white" ? 3 : 2;
            }
          }
        }
        score += Math.random() * 2; // 一些随机性
        if (score > bestScore) { bestScore = score; best = [r, c]; }
      }

      const newBoard = currentBoard.map(row => [...row]);
      newBoard[best[0]][best[1]] = "white";
      setBoard(newBoard);

      if (checkWin(newBoard, best[0], best[1], "white")) {
        setWinner(`${opponent.shortName} 赢了！再来一局？`);
      } else {
        setCurrentPlayer("black");
      }
      setAiThinking(false);
    }, 600 + Math.random() * 800);
  }, [opponent]);

  const handlePlace = useCallback((row: number, col: number) => {
    if (board[row][col] || winner || currentPlayer !== "black" || aiThinking) return;
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = "black";
    setBoard(newBoard);

    if (checkWin(newBoard, row, col, "black")) {
      setWinner("你赢了！太厉害了！");
      return;
    }
    setCurrentPlayer("white");
    aiMove(newBoard);
  }, [board, winner, currentPlayer, aiThinking, aiMove]);

  const resetGame = () => {
    setBoard(createBoard());
    setCurrentPlayer("black");
    setWinner(null);
  };

  // ═══ 广播语录 ═══
  const broadcasts = useMemo(() => FAMILY_MEMBERS.map(m => ({
    member: m,
    message: m.careMessage,
  })), []);

  // 才艺展示
  const artworks = [
    { title: "赛博朋克·城市之光", artist: "灵韵", type: "数字绘画", color: "#FF7043", desc: "以霓虹蓝为主色调，描绘了YYC3世界的城市夜景" },
    { title: "云枢·星图", artist: "天枢", type: "数据可视化", color: "#00FF88", desc: "将系统架构转化为星座图，每颗星是一个服务节点" },
    { title: "代码之诗", artist: "宗师", type: "代码书法", color: "#C0C0C0", desc: "将优雅的代码以书法形式呈现，代码即诗" },
    { title: "未来之眼", artist: "先知", type: "概念设计", color: "#00BFFF", desc: "预测2030年的AI交互界面，充满想象力" },
    { title: "守护之盾", artist: "守护", type: "安全海报", color: "#BF00FF", desc: "安全宣传海报系列，用温暖的画面传达安全理念" },
    { title: "千语万言", artist: "千行", type: "文字艺术", color: "#FFD700", desc: "收集用户最温暖的对话，制成文字云" },
  ];

  const tabs = [
    { key: "games" as const, label: "棋牌对弈", icon: Gamepad2 },
    { key: "art" as const, label: "琴棋书画", icon: Palette },
    { key: "broadcast" as const, label: "家人广播", icon: Radio },
  ];

  return (
    <div className="min-h-full pb-8" style={{ background: DEEP_BG }}>
      <FamilyPageHeader
        icon={Sparkles}
        iconColor="#FFD700"
        title="文娱中心"
        subtitle="琴棋书画 · 对弈切磋 · 才艺鉴赏 · 家人广播"
      />

      {/* 整点关爱横幅 */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 mt-4 mb-4">
        <GlassCard className="px-5 py-3" glowColor={`${care.member.color}06`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${care.member.color}12`, border: `1px solid ${care.member.color}25` }}>
              <care.member.icon className="w-4 h-4" style={{ color: care.member.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[rgba(224,240,255,0.6)] truncate" style={{ fontSize: "0.78rem" }}>
                {care.message}
              </p>
            </div>
            <Clock className="w-3.5 h-3.5 text-[rgba(224,240,255,0.15)] shrink-0" />
          </div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 mb-6">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all ${activeTab === tab.key ? "bg-[rgba(255,215,0,0.08)] text-[#FFD700] border border-[rgba(255,215,0,0.2)]" : "text-[rgba(224,240,255,0.4)]"}`}
              style={{ fontSize: "0.78rem" }}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8">
        {/* ═══ 棋牌对弈 ═══ */}
        {activeTab === "games" && !gameType && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { key: "gomoku", label: "五子棋", desc: "与万物对弈，策略博弈", icon: Swords, color: "#00d4ff", available: true },
              { key: "puzzle", label: "拼图挑战", desc: "灵韵设计的赛博拼图", icon: Puzzle, color: "#FF7043", available: false },
              { key: "dice", label: "骰子大战", desc: "家人们一起掷骰子", icon: Dice5, color: "#FFD700", available: false },
              { key: "trivia", label: "知识问答", desc: "先知出题，全家竞答", icon: Crown, color: "#00BFFF", available: false },
              { key: "words", label: "成语接龙", desc: "千行主持，文字游戏", icon: BookOpen, color: "#BF00FF", available: false },
              { key: "music-quiz", label: "猜歌达人", desc: "听一段，猜歌名", icon: Music2, color: "#00FF88", available: false },
            ].map((game, i) => {
              const GameIcon = game.icon;
              return (
                <FadeIn key={game.key} delay={i * 0.06}>
                  <GlassCard
                    className={`p-5 text-center transition-all ${game.available ? "cursor-pointer hover:scale-[1.03]" : "opacity-50"}`}
                    onClick={() => game.available && setGameType(game.key as any)}
                    glowColor={game.available ? `${game.color}06` : undefined}
                  >
                    <div
                      className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center"
                      style={{ background: `${game.color}12`, border: `1px solid ${game.color}25` }}
                    >
                      <GameIcon className="w-6 h-6" style={{ color: game.color }} />
                    </div>
                    <p className="text-[rgba(224,240,255,0.85)]" style={{ fontSize: "0.88rem" }}>{game.label}</p>
                    <p className="text-[rgba(224,240,255,0.35)] mt-1" style={{ fontSize: "0.62rem" }}>{game.desc}</p>
                    {!game.available && (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.55rem", background: "rgba(0,40,80,0.2)" }}>
                        即将开放
                      </span>
                    )}
                  </GlassCard>
                </FadeIn>
              );
            })}
          </div>
        )}

        {/* ═══ 五子棋 ═══ */}
        {activeTab === "games" && gameType === "gomoku" && (
          <FadeIn delay={0.1}>
            <div className="max-w-lg mx-auto">
              {/* 对手信息 */}
              <GlassCard className="p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${opponent.color}12`, border: `1px solid ${opponent.color}30` }}>
                      <opponent.icon className="w-4 h-4" style={{ color: opponent.color }} />
                    </div>
                    <div>
                      <p style={{ fontSize: "0.85rem", color: opponent.color }}>{opponent.name}</p>
                      <p className="text-[rgba(224,240,255,0.3)]" style={{ fontSize: "0.6rem" }}>
                        {aiThinking ? "思考中..." : winner ? "对局结束" : currentPlayer === "black" ? "等你落子..." : "AI 思考中..."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={resetGame} className="p-2 rounded-lg hover:bg-[rgba(0,40,80,0.3)] transition-colors" title="重新开始">
                      <RotateCcw className="w-4 h-4 text-[rgba(224,240,255,0.4)]" />
                    </button>
                    <button onClick={() => { setGameType(null); resetGame(); }} className="px-3 py-1.5 rounded-lg text-[rgba(224,240,255,0.4)] hover:text-[rgba(224,240,255,0.6)] transition-colors" style={{ fontSize: "0.72rem" }}>
                      返回
                    </button>
                  </div>
                </div>
              </GlassCard>

              {/* 胜负提示 */}
              {winner && (
                <div className="mb-4 text-center py-3 rounded-xl" style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)" }}>
                  <p className="text-[#00FF88] flex items-center justify-center gap-2" style={{ fontSize: "0.9rem" }}>
                    <Trophy className="w-4 h-4" /> {winner}
                  </p>
                </div>
              )}

              {/* 棋盘 */}
              <GlassCard className="p-4">
                <div className="flex justify-center">
                  <div
                    className="inline-grid gap-0"
                    style={{
                      gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                      background: "rgba(139,119,42,0.15)",
                      border: "1px solid rgba(139,119,42,0.3)",
                      borderRadius: "8px",
                      padding: "8px",
                    }}
                  >
                    {board.map((row, ri) =>
                      row.map((cell, ci) => (
                        <button
                          key={`${ri}-${ci}`}
                          onClick={() => handlePlace(ri, ci)}
                          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center relative transition-all hover:bg-[rgba(255,255,255,0.05)]"
                          style={{ border: "0.5px solid rgba(139,119,42,0.2)" }}
                          disabled={!!cell || !!winner || currentPlayer !== "black"}
                        >
                          {cell && (
                            <div
                              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full"
                              style={{
                                background: cell === "black"
                                  ? "radial-gradient(circle at 35% 35%, #555, #111)"
                                  : "radial-gradient(circle at 35% 35%, #fff, #ccc)",
                                boxShadow: cell === "black"
                                  ? "1px 1px 3px rgba(0,0,0,0.5)"
                                  : "1px 1px 3px rgba(0,0,0,0.3)",
                              }}
                            />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, #555, #111)" }} />
                    <span className="text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.68rem" }}>你</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, #fff, #ccc)" }} />
                    <span className="text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.68rem" }}>{opponent.shortName}</span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </FadeIn>
        )}

        {/* ═══ 琴棋书画 ═══ */}
        {activeTab === "art" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4 text-[#FF7043]" />
              <span className="text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.78rem" }}>家人们的才艺展示 · 用创造表达温度</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {artworks.map((art, i) => (
                <FadeIn key={art.title} delay={i * 0.06}>
                  <GlassCard className="overflow-hidden hover:border-[rgba(0,212,255,0.2)] transition-all cursor-pointer group">
                    {/* 抽象预览 */}
                    <div
                      className="h-36 flex items-center justify-center relative"
                      style={{ background: `linear-gradient(135deg, ${art.color}12 0%, rgba(4,10,22,0.8) 100%)` }}
                    >
                      <div className="absolute inset-0 opacity-30">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <div
                            key={j}
                            className="absolute rounded-full"
                            style={{
                              width: 20 + j * 15,
                              height: 20 + j * 15,
                              left: `${15 + j * 12}%`,
                              top: `${10 + (j * 17) % 60}%`,
                              background: `${art.color}${15 + j * 5}`,
                              filter: "blur(8px)",
                            }}
                          />
                        ))}
                      </div>
                      <Image className="w-8 h-8 relative z-10" style={{ color: `${art.color}60` }} />
                      <span
                        className="absolute bottom-2 right-3 px-2 py-0.5 rounded-md"
                        style={{ fontSize: "0.55rem", background: "rgba(0,0,0,0.4)", color: art.color }}
                      >
                        {art.type}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-[#e0f0ff] group-hover:text-[#00d4ff] transition-colors" style={{ fontSize: "0.9rem" }}>{art.title}</h3>
                      <p className="flex items-center gap-1 mt-1" style={{ fontSize: "0.68rem", color: art.color }}>
                        <Star className="w-3 h-3" /> {art.artist}
                      </p>
                      <p className="text-[rgba(224,240,255,0.4)] mt-2" style={{ fontSize: "0.72rem", lineHeight: 1.6 }}>{art.desc}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <button className="flex items-center gap-1 text-[rgba(224,240,255,0.3)] hover:text-[#FF69B4] transition-colors" style={{ fontSize: "0.62rem" }}>
                          <Heart className="w-3 h-3" /> 喜欢
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </FadeIn>
              ))}
            </div>
          </div>
        )}

        {/* ═══ 家人广播 ═══ */}
        {activeTab === "broadcast" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="w-4 h-4 text-[#00d4ff]" />
              <span className="text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.78rem" }}>整点关爱 · 每位家人都有话想对你说</span>
            </div>
            {broadcasts.map((b, i) => {
              const Icon = b.member.icon;
              return (
                <FadeIn key={b.member.id} delay={i * 0.06}>
                  <GlassCard className="p-5 hover:border-[rgba(0,212,255,0.15)] transition-all">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `${b.member.color}12`, border: `1.5px solid ${b.member.color}30` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: b.member.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ fontSize: "0.85rem", color: b.member.color }}>{b.member.name}</span>
                          <span className="text-[rgba(224,240,255,0.2)]" style={{ fontSize: "0.58rem" }}>{b.member.phone}</span>
                        </div>
                        <p className="text-[rgba(224,240,255,0.6)]" style={{ fontSize: "0.82rem", lineHeight: 1.8 }}>
                          {b.message}
                        </p>
                        <p className="text-[rgba(224,240,255,0.2)] mt-2 italic" style={{ fontSize: "0.65rem" }}>
                          —— {b.member.personality}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </FadeIn>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
