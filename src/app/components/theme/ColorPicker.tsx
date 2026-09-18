/**
 * ColorPicker.tsx
 * ================
 * HEX 颜色选择器 · 赛博朋克风格
 * 包含: 色相/饱和度/明度面板 + 色相滑条 + HEX/R/G/B 输入
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  hexToRgb, rgbToHex, hsvToRgb, rgbToHsv, hexToOklch, formatOklch,
} from "./color-utils";

interface ColorPickerProps {
  value: string; // HEX
  onChange: (hex: string) => void;
  onClose?: () => void;
}

export function ColorPicker({ value, onChange, onClose }: ColorPickerProps) {
  const [rgb, setRgb] = useState<[number, number, number]>(() => hexToRgb(value));
  const [hsv, setHsv] = useState<[number, number, number]>(() => rgbToHsv(...hexToRgb(value)));
  const [hexInput, setHexInput] = useState(value.replace("#", ""));

  const svCanvasRef = useRef<HTMLCanvasElement>(null);
  const hueCanvasRef = useRef<HTMLCanvasElement>(null);
  const svDragging = useRef(false);
  const hueDragging = useRef(false);

  // sync external value
  useEffect(() => {
    const newRgb = hexToRgb(value);
    const newHsv = rgbToHsv(...newRgb);
    setRgb(newRgb);
    setHsv(newHsv);
    setHexInput(value.replace("#", ""));
  }, [value]);

  // ── Draw SV canvas ──
  const drawSV = useCallback((hue: number) => {
    const canvas = svCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // base color
    const [br, bg, bb] = hsvToRgb(hue, 1, 1);
    ctx.fillStyle = `rgb(${br},${bg},${bb})`;
    ctx.fillRect(0, 0, w, h);

    // white → transparent horizontal
    const gradW = ctx.createLinearGradient(0, 0, w, 0);
    gradW.addColorStop(0, "rgba(255,255,255,1)");
    gradW.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradW;
    ctx.fillRect(0, 0, w, h);

    // transparent → black vertical
    const gradB = ctx.createLinearGradient(0, 0, 0, h);
    gradB.addColorStop(0, "rgba(0,0,0,0)");
    gradB.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = gradB;
    ctx.fillRect(0, 0, w, h);
  }, []);

  // ── Draw Hue bar ──
  const drawHue = useCallback(() => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 6; i++) {
      const [r, g, b] = hsvToRgb(i * 60, 1, 1);
      grad.addColorStop(i / 6, `rgb(${r},${g},${b})`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, []);

  useEffect(() => {
    drawSV(hsv[0]);
    drawHue();
  }, [drawSV, drawHue, hsv[0]]);

  // ── SV interactions ──
  const handleSVPick = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = svCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const newHsv: [number, number, number] = [hsv[0], x, 1 - y];
    setHsv(newHsv);
    const newRgb = hsvToRgb(...newHsv);
    setRgb(newRgb);
    const hex = rgbToHex(...newRgb);
    setHexInput(hex.replace("#", ""));
    onChange(hex);
  }, [hsv[0], onChange]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (svDragging.current) handleSVPick(e); };
    const onUp = () => { svDragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [handleSVPick]);

  // ── Hue interactions ──
  const handleHuePick = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newHue = x * 360;
    const newHsv: [number, number, number] = [newHue, hsv[1], hsv[2]];
    setHsv(newHsv);
    drawSV(newHue);
    const newRgb = hsvToRgb(...newHsv);
    setRgb(newRgb);
    const hex = rgbToHex(...newRgb);
    setHexInput(hex.replace("#", ""));
    onChange(hex);
  }, [hsv[1], hsv[2], drawSV, onChange]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (hueDragging.current) handleHuePick(e); };
    const onUp = () => { hueDragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [handleHuePick]);

  // ── Input handlers ──
  const commitHex = (v: string) => {
    const clean = v.replace(/[^0-9a-fA-F]/g, "").substring(0, 6).padEnd(6, "0");
    const hex = "#" + clean;
    setHexInput(clean);
    setRgb(hexToRgb(hex));
    setHsv(rgbToHsv(...hexToRgb(hex)));
    onChange(hex);
  };

  const commitRgbChannel = (ch: 0 | 1 | 2, val: string) => {
    const n = Math.max(0, Math.min(255, parseInt(val) || 0));
    const newRgb: [number, number, number] = [...rgb];
    newRgb[ch] = n;
    setRgb(newRgb);
    setHsv(rgbToHsv(...newRgb));
    const hex = rgbToHex(...newRgb);
    setHexInput(hex.replace("#", ""));
    onChange(hex);
  };

  const oklch = hexToOklch("#" + hexInput.padEnd(6, "0"));

  return (
    <div
      className="w-[280px] rounded-xl border border-[rgba(0,180,255,0.25)] bg-[rgba(8,18,38,0.97)] backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-3 space-y-2.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Color swatch + HEX input */}
      <div className="flex items-center gap-2 rounded-lg border border-[rgba(0,180,255,0.15)] bg-[rgba(0,20,40,0.6)] px-2.5 py-1.5">
        <div
          className="w-7 h-7 rounded-md border border-[rgba(255,255,255,0.12)] shrink-0"
          style={{ backgroundColor: "#" + hexInput.padEnd(6, "0") }}
        />
        <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.8rem" }}>#</span>
        <input
          className="flex-1 bg-transparent text-[#e0f0ff] outline-none"
          style={{ fontSize: "0.85rem", fontFamily: "monospace" }}
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value.replace(/[^0-9a-fA-F]/g, "").substring(0, 6))}
          onBlur={() => commitHex(hexInput)}
          onKeyDown={(e) => { if (e.key === "Enter") commitHex(hexInput); }}
          maxLength={6}
          spellCheck={false}
        />
      </div>

      {/* SV Picker */}
      <div className="relative rounded-lg overflow-hidden cursor-crosshair" style={{ height: 160 }}>
        <canvas
          ref={svCanvasRef}
          width={260}
          height={160}
          className="w-full h-full"
          onMouseDown={(e) => { svDragging.current = true; handleSVPick(e); }}
        />
        {/* Pointer */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.5)] pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${hsv[1] * 100}%`,
            top: `${(1 - hsv[2]) * 100}%`,
            backgroundColor: "#" + hexInput.padEnd(6, "0"),
          }}
        />
      </div>

      {/* Hue slider */}
      <div className="relative rounded-full overflow-hidden cursor-pointer" style={{ height: 14 }}>
        <canvas
          ref={hueCanvasRef}
          width={260}
          height={14}
          className="w-full h-full rounded-full"
          onMouseDown={(e) => { hueDragging.current = true; handleHuePick(e); }}
        />
        <div
          className="absolute top-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.4)] pointer-events-none -translate-x-1/2"
          style={{ left: `${(hsv[0] / 360) * 100}%` }}
        />
      </div>

      {/* HEX / R / G / B inputs */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="flex flex-col items-center gap-0.5">
          <input
            className="w-full text-center rounded-md border border-[rgba(0,180,255,0.15)] bg-[rgba(0,20,40,0.5)] text-[#e0f0ff] px-1 py-1 outline-none focus:border-[#00d4ff]"
            style={{ fontSize: "0.72rem", fontFamily: "monospace" }}
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value.replace(/[^0-9a-fA-F]/g, "").substring(0, 6))}
            onBlur={() => commitHex(hexInput)}
            onKeyDown={(e) => { if (e.key === "Enter") commitHex(hexInput); }}
            maxLength={6}
          />
          <span className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.6rem" }}>Hex</span>
        </div>
        {(["R", "G", "B"] as const).map((ch, i) => (
          <div key={ch} className="flex flex-col items-center gap-0.5">
            <input
              className="w-full text-center rounded-md border border-[rgba(0,180,255,0.15)] bg-[rgba(0,20,40,0.5)] text-[#e0f0ff] px-1 py-1 outline-none focus:border-[#00d4ff]"
              style={{ fontSize: "0.72rem", fontFamily: "monospace" }}
              value={rgb[i]}
              onChange={(e) => commitRgbChannel(i as 0 | 1 | 2, e.target.value)}
              type="number"
              min={0}
              max={255}
            />
            <span className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.6rem" }}>{ch}</span>
          </div>
        ))}
      </div>

      {/* OKLch display */}
      <div className="px-2 py-1.5 rounded-md bg-[rgba(0,212,255,0.04)] border border-[rgba(0,180,255,0.08)]">
        <p className="text-[rgba(0,212,255,0.5)] truncate" style={{ fontSize: "0.62rem", fontFamily: "monospace" }}>
          {formatOklch(oklch)}
        </p>
      </div>
    </div>
  );
}
