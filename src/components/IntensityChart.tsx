import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { acts, timeline } from '../model/analysis';
import { useEditor, useProject } from '../store';
import { KIND_COLOR, KIND_LABEL, duration } from '../theme';

// A single series, so it wears neutral ink rather than a category colour.
const LINE = '#c3c6d0';
const HEIGHT = 210;
const M = { top: 24, right: 16, bottom: 26, left: 40 };

/** Tick spacing in minutes that reads naturally on a clock. */
function timeStep(raw: number): number {
  return [5, 10, 15, 20, 30, 60, 90, 120, 180, 240, 360, 480, 720].find((s) => s >= raw) ?? Math.ceil(raw / 720) * 720;
}

export function IntensityChart() {
  const project = useProject();
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hover, setHover] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const { start, end, total } = useMemo(() => timeline(project), [project]);
  const actList = useMemo(() => acts(project), [project]);
  const beats = project.beats;
  const hasData = beats.length > 0 && total > 0;

  // Re-attach when the plot appears, since it isn't rendered without data.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasData]);

  const plotW = width - M.left - M.right;
  const plotH = HEIGHT - M.top - M.bottom;
  const x = (minute: number) => M.left + (total > 0 ? (minute / total) * plotW : 0);
  const y = (intensity: number) => M.top + plotH - (Math.min(5, Math.max(0, intensity)) / 5) * plotH;
  const selectedIndex = beats.findIndex((b) => b.id === selectedId);
  const focus = hover ?? (selectedIndex >= 0 ? selectedIndex : null);

  if (!hasData) {
    return (
      <section className="card">
        <h2>Intensity over time</h2>
        <p className="muted note">Give the beats some minutes to see the curve.</p>
      </section>
    );
  }

  // Step line: flat across each beat, vertical between beats.
  const line = beats.map((b, i) => `${i ? 'L' : 'M'}${x(start[i]).toFixed(1)},${y(b.intensity).toFixed(1)}H${x(end[i]).toFixed(1)}`).join('');
  const area = `${line}V${y(0)}H${x(0)}Z`;
  const step = timeStep(total / 6);
  const ticks: number[] = [];
  for (let t = 0; t <= total + 0.001; t += step) ticks.push(t);

  const beatAt = (clientX: number) => {
    const minute = ((clientX - wrap.current!.getBoundingClientRect().left - M.left) / plotW) * total;
    const i = end.findIndex((e) => minute < e);
    return i < 0 ? beats.length - 1 : i;
  };
  const onKey = (e: KeyboardEvent) => {
    const from = selectedIndex >= 0 ? selectedIndex : -1;
    const to = e.key === 'ArrowRight' ? from + 1 : e.key === 'ArrowLeft' ? from - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? beats.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    select(beats[Math.min(beats.length - 1, Math.max(0, to))].id);
  };

  // The selected beat is always highlighted; its details only show while pointing or using the keyboard.
  const tip = focus !== null && (hover !== null || keyboard) ? beats[focus] : null;
  const tipX = focus !== null ? x((start[focus] + end[focus]) / 2) : 0;
  const tipLeft = tipX > width - 220 ? tipX - 214 : tipX + 12;

  return (
    <section className="card">
      <div className="card-head">
        <h2>Intensity over time</h2>
        <span className="muted note">
          {duration(total)} in {beats.length} beats. The shaded band is breather intensity (≤ {project.settings.restAtMost}). Click a beat to select its row.
        </span>
      </div>
      <div
        ref={wrap}
        className="plot"
        tabIndex={0}
        role="img"
        aria-label="Intensity over play time. Use the arrow keys to step through beats; the beat chart below has every value."
        onPointerMove={(e) => setHover(beatAt(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => select(beats[beatAt(e.clientX)].id)}
        onKeyDown={onKey}
        onKeyUp={() => setKeyboard(true)}
        onBlur={() => setKeyboard(false)}
      >
        <svg width={width} height={HEIGHT}>
          {actList.map((a, n) => (
            <g key={`${a.name}-${a.first}`}>
              {n % 2 === 1 && <rect x={x(start[a.first])} y={M.top} width={x(end[a.last]) - x(start[a.first])} height={plotH} className="act-band" />}
              <text className="act-label" x={x(start[a.first]) + 4} y={M.top - 8}>
                {a.name || 'No act'}
              </text>
            </g>
          ))}
          <rect x={M.left} y={y(project.settings.restAtMost)} width={plotW} height={y(0) - y(project.settings.restAtMost)} className="rest-band" />
          {[1, 2, 3, 4, 5].map((v) => (
            <g key={v} className="gridline">
              <line x1={M.left} x2={M.left + plotW} y1={y(v)} y2={y(v)} />
              <text x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          <line className="baseline" x1={M.left} x2={M.left + plotW} y1={y(0)} y2={y(0)} />
          {ticks.map((t) => (
            <text key={t} className="tick" x={x(t)} y={HEIGHT - 8} textAnchor="middle">
              {t === 0 ? '0' : duration(t)}
            </text>
          ))}
          <path d={area} fill={LINE} fillOpacity={0.1} />
          {focus !== null && (
            <rect className="focus-band" x={x(start[focus])} y={M.top} width={Math.max(2, x(end[focus]) - x(start[focus]))} height={plotH} />
          )}
          <path d={line} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        {tip && focus !== null && (
          <div className="tooltip" style={{ left: tipLeft, top: M.top }}>
            <div className="tip-title">
              {tip.act ? `${tip.act} · ` : ''}
              {Math.round(start[focus])}–{Math.round(end[focus])} min
            </div>
            <div className="tip-row">
              <strong>{tip.title || 'Untitled'}</strong>
            </div>
            <div className="tip-row">
              <i className="kind-dot" style={{ background: KIND_COLOR[tip.kind] }} />
              <span>{KIND_LABEL[tip.kind]}</span>
            </div>
            <div className="tip-row">
              <strong>{tip.intensity}</strong>
              <span>intensity · {duration(tip.minutes)}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
