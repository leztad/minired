import React, { useState } from 'react';
import { HistoryPoint } from '../types';
import { TrendingUp, Clock } from 'lucide-react';

interface HistorialHostsProps {
  historyData: HistoryPoint[];
}

export default function HistorialHosts({ historyData }: HistorialHostsProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (historyData.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-md text-slate-500 h-[180px] flex items-center justify-center font-sans text-xs">
        Sin datos históricos suficientes. Ejecute un escaneo.
      </div>
    );
  }

  // Simple math for mapping points to the SVG box
  const width = 500;
  const height = 110;
  const paddingX = 35;
  const paddingY = 15;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Find max hosts to scale Y axis (default at least 5 for display, or more)
  const maxHosts = Math.max(...historyData.map(d => d.hostsActivos), 5);
  const minHosts = 0;

  // Convert points to SVG coords
  const points = historyData.map((d, i) => {
    const x = paddingX + (i / (historyData.length - 1 || 1)) * chartWidth;
    const ratioY = (d.hostsActivos - minHosts) / (maxHosts - minHosts || 1);
    const y = height - paddingY - ratioY * chartHeight;
    return { x, y, raw: d };
  });

  // Generate SVG path for line
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Generate SVG path for filled area under the line
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z` 
    : '';

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-md text-slate-300">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase text-slate-400 font-display flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          Historial de Hosts en Línea
        </h3>
        {historyData.length > 0 && (
          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Actualizado: {historyData[historyData.length - 1].timeLabels}
          </div>
        )}
      </div>

      <div className="relative w-full">
        {/* SVG Wrapper with aspect-ratio for perfect fit */}
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Ambient gradients */}
            <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {[0, 0.5, 1].map((ratio, idx) => {
            const h = height - paddingY - ratio * chartHeight;
            const value = Math.round(minHosts + ratio * (maxHosts - minHosts));
            return (
              <g key={idx}>
                <line 
                  x1={paddingX} 
                  y1={h} 
                   x2={width - paddingX} 
                  y2={h} 
                  stroke="#1e293b" 
                  strokeWidth="1" 
                  strokeDasharray="3,3" 
                />
                <text 
                  x={paddingX - 8} 
                  y={h + 3} 
                  textAnchor="end" 
                  className="fill-slate-500 text-[8px] font-mono"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Vertical Time Labels */}
          {historyData.map((d, idx) => {
            if (idx === 0 || idx === historyData.length - 1 || idx === Math.floor(historyData.length / 2)) {
              const x = paddingX + (idx / (historyData.length - 1 || 1)) * chartWidth;
              return (
                <text
                  key={idx}
                  x={x}
                  y={height - 2}
                  textAnchor="middle"
                  className="fill-slate-500 text-[8px] font-mono"
                >
                  {d.timeLabels}
                </text>
              );
            }
            return null;
          })}

          {/* Render Area fill */}
          {areaPath && (
            <path d={areaPath} fill="url(#chartAreaGradient)" />
          )}

          {/* Render Line */}
          {linePath && (
            <path 
              d={linePath} 
              fill="none" 
              stroke="url(#lineGlow)" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}

          {/* Render Points on the line */}
          {points.map((p, idx) => {
            const isHovered = hoverIndex === idx;
            return (
              <g 
                key={idx} 
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Bigger invisible touch target */}
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r={10} 
                  fill="transparent" 
                />
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r={isHovered ? 4.5 : 3} 
                  className={`${isHovered ? 'fill-cyan-400' : 'fill-cyan-500'} stroke-[#0F172A] transition-all duration-150`}
                  strokeWidth="1.5" 
                />
              </g>
            );
          })}
        </svg>

        {/* Dynamic HTML Tooltip inside absolute coordinates */}
        {hoverIndex !== null && points[hoverIndex] && (
          <div 
            className="absolute bg-slate-900 text-slate-100 text-[10px] p-1.5 rounded-sm border border-slate-800 shadow-md pointer-events-none font-mono z-20"
            style={{
              left: `${(points[hoverIndex].x / width) * 100}%`,
              top: `${Math.max((points[hoverIndex].y / height) * 100 - 35, 0)}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div>Hora: {points[hoverIndex].raw.timeLabels}</div>
            <div className="text-cyan-400 font-semibold">Hosts up: {points[hoverIndex].raw.hostsActivos}</div>
            <div className="text-teal-400">Lat: {points[hoverIndex].raw.latenciaMedia} ms</div>
          </div>
        )}
      </div>

      {/* Legend / Info footer for chart */}
      <div className="flex gap-4 items-center justify-center mt-3 text-[10px] text-slate-500 border-t border-slate-800/60 pt-2 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block"></span>
          Hosts en línea (Ping OK)
        </span>
        <span className="text-slate-700">|</span>
        <span className="font-sans">Gráfica generada dinámicamente según escaneos activos</span>
      </div>
    </div>
  );
}
