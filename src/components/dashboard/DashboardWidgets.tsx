import { useState, useRef } from 'react';
import type { TrendPoint } from '../../services/dashboardService';

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: 'brand' | 'cyan' | 'amber' | 'rose';
}) {
  return (
    <div className={`stat-card stat-card--${accent || 'brand'}`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-body">
        <p className="stat-card-label">{label}</p>
        <p className="stat-card-value">{value}</p>
        {sub && <p className="stat-card-sub">{sub}</p>}
      </div>
    </div>
  );
}

export function RatingBar({ star, count, max }: { star: number; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1'];
  return (
    <div className="rating-bar-row">
      <span className="rating-bar-label">{star}★</span>
      <div className="rating-bar-track">
        <div
          className="rating-bar-fill"
          style={{ width: `${pct}%`, background: colors[star - 1] }}
        />
      </div>
      <span className="rating-bar-count">{count}</span>
    </div>
  );
}

export function PremiumTrendChart({ data }: { data: TrendPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div className="trend-empty">
        <p>No trend data for single-day view.</p>
      </div>
    );
  }

  const width = 600;
  const height = 220;
  const padT = 20;
  const padB = 30;
  const padL = 35;
  const padR = 15;

  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const getX = (idx: number) => padL + (idx * (chartW / Math.max(1, data.length - 1)));
  const getY = (val: number) => padT + chartH - ((val / 5) * chartH);

  const points = data.map((pt, i) => ({
    x: getX(i),
    y: getY(pt.avgRating || 0),
    rating: pt.avgRating,
    count: pt.count,
    label: pt.label
  }));

  let linePath = "";
  let areaPath = "";

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    areaPath = `${linePath} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`;
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;
    
    let closestIdx = 0;
    let minDiff = Infinity;
    points.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    setHoveredIdx(closestIdx);
  };

  return (
    <div ref={containerRef} className="premium-chart-container" style={{ position: 'relative', height: '100%' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
        style={{ overflow: 'visible', cursor: 'crosshair' }}
      >
        <defs>
          <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A1A1A" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#1A1A1A" stopOpacity="0.00" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Gridlines */}
        {[0, 1, 2, 3, 4, 5].map((val) => {
          const y = getY(val);
          return (
            <g key={val} className="chart-gridline">
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke={val === 0 ? "#1A1A1A" : "#C8C8C0"}
                strokeWidth={val === 0 ? "2" : "1.5"}
                strokeDasharray={val === 0 ? undefined : "6 4"}
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fontWeight="700"
                fill="#1A1A1A"
              >
                {val}★
              </text>
            </g>
          );
        })}

        {/* Fill Area */}
        {areaPath && (
          <path d={areaPath} fill="url(#chartAreaGradient)" />
        )}

        {/* Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#1A1A1A"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {/* Labels */}
        {points.map((pt, i) => (
          <text
            key={i}
            x={pt.x}
            y={height - 5}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="#8A8A80"
          >
            {pt.label}
          </text>
        ))}

        {/* Tracker */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <line
            x1={points[hoveredIdx].x}
            y1={padT}
            x2={points[hoveredIdx].x}
            y2={padT + chartH}
            stroke="#6b6b63"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        )}

        {/* Dots */}
        {points.map((pt, i) => {
          const isActive = hoveredIdx === i;
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={isActive ? 7 : 5}
              fill={isActive ? "#1A1A1A" : "#ffffff"}
              stroke="#1A1A1A"
              strokeWidth={isActive ? 3 : 2.5}
              style={{ transition: 'r 0.1s, stroke-width 0.1s' }}
            />
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className="chart-tooltip-box"
          style={{
            position: 'absolute',
            left: `${((points[hoveredIdx].x - padL) / chartW) * 100}%`,
            top: `${(points[hoveredIdx].y / height) * 100 - 15}%`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 10,
            background: '#1A1A1A',
            color: '#ffffff',
            padding: '6px 10px',
            borderRadius: '2px',
            fontSize: '0.7rem',
            boxShadow: '3px 3px 0px #1A1A1A',
            border: '2px solid #1A1A1A',
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
          }}
        >
          <span style={{ fontWeight: 700, color: '#e9f2e7' }}>{points[hoveredIdx].label}</span>
          <span style={{ fontWeight: 600 }}>Avg Rating: {points[hoveredIdx].rating} ★</span>
          {points[hoveredIdx].count > 0 && (
            <span style={{ opacity: 0.8 }}>{points[hoveredIdx].count} reviews</span>
          )}
        </div>
      )}
    </div>
  );
}

export function RadialConversionRate({ scans, clicks }: { scans: number; clicks: number }) {
  const rate = scans > 0 ? Math.round((clicks / scans) * 100) : 0;
  const size = 100;
  const strokeW = 9;
  const radius = (size - strokeW) / 2;
  const circ = 2 * Math.PI * radius;
  const strokeOffset = circ - (rate / 100) * circ;

  return (
    <div className="db-card conversion-radial-card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
      <div className="radial-svg-wrapper" style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f2f0ea" strokeWidth={strokeW} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1A1A1A"
            strokeWidth={strokeW}
            strokeDasharray={circ}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1
        }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A1A1A' }}>{rate}%</span>
          <span style={{ fontSize: '0.55rem', fontWeight: 600, color: '#8A8A80', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Redir.</span>
        </div>
      </div>
      <div className="conversion-info" style={{ flex: 1, minWidth: 0 }}>
        <h2 className="db-card-title" style={{ margin: '0 0 4px 0' }}>Redirection rate</h2>
        <p style={{ fontSize: '0.75rem', color: '#6B6B63', margin: '0 0 10px 0', lineHeight: 1.4 }}>
          QR scans converted to Google review page clicks.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B6B63' }}>
            <span>Success clicks:</span>
            <strong style={{ color: '#1A1A1A' }}>{clicks}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B6B63' }}>
            <span>Total QR scans:</span>
            <strong style={{ color: '#1A1A1A' }}>{scans}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
