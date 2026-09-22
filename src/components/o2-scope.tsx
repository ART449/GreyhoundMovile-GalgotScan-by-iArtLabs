import type { OxygenSample } from "@/lib/obd/oxygen";

const VIEW_MS = 10000;

export function O2Scope({
  samples,
  preHz,
  postHz,
}: {
  samples: OxygenSample[];
  preHz?: number | null;
  postHz?: number | null;
}) {
  const w = 640;
  const h = 228;
  const padL = 36;
  const padR = 18;
  const padT = 10;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const tEnd = samples.at(-1)?.t ?? 0;
  const tFirst = samples[0]?.t ?? tEnd;
  const tStart = Math.max(tFirst, tEnd - VIEW_MS);
  const span = Math.max(tEnd - tStart, 1000);
  const xAt = (t: number) => padL + ((t - tStart) / span) * innerW;
  const yAt = (v: number) => padT + (1 - Math.min(1.1, Math.max(0, v)) / 1.1) * innerH;

  const visible = samples.filter((s) => s.t >= tStart);
  const toPts = (key: "pre" | "post") =>
    visible
      .filter((s) => s[key] != null)
      .map((s) => `${xAt(s.t).toFixed(1)},${yAt(s[key] as number).toFixed(1)}`)
      .join(" ");
  const prePts = toPts("pre");
  const postPts = toPts("post");
  const lastPre = [...visible].reverse().find((s) => s.pre != null);
  const lastPost = [...visible].reverse().find((s) => s.post != null);
  const grid = [0, 0.25, 0.45, 0.7, 1];
  const hzLabel = (n: number | null | undefined) =>
    n == null || !Number.isFinite(n) ? "—" : `${n.toFixed(1)} Hz`;
  const ticks = [0, 0.5, 1].map((f) => {
    const t = tStart + f * span;
    const ago = (tEnd - t) / 1000;
    return { id: f, t, label: ago < 0.35 ? "ahora" : `−${Math.round(ago)}s` };
  });

  return (
    <div className="overflow-hidden rounded-2xl bg-bg-deep shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between px-4 pt-3">
        <p className="font-display text-[11px] tracking-[0.2em] text-muted uppercase">
          Osciloscopio · banco 1 · {Math.round(span / 1000)} s
        </p>
        <p className="font-mono text-[11px] text-muted">
          <span className="text-crimson">B1S1 {hzLabel(preHz)}</span>
          {" · "}
          <span className="text-chrome">B1S2 {hzLabel(postHz)}</span>
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-52 w-full" role="img" aria-label="Gráfica de sensores de oxígeno">
        {grid.map((g) => (
          <g key={g}>
            <line
              x1={padL}
              x2={w - padR}
              y1={yAt(g)}
              y2={yAt(g)}
              stroke="currentColor"
              className="text-border"
              strokeDasharray={g === 0.45 ? "4 3" : "2 6"}
              strokeWidth={g === 0.45 ? 1.2 : 0.6}
            />
            <text
              x={padL - 6}
              y={yAt(g) + 3}
              textAnchor="end"
              className="fill-muted"
              fontSize="10"
              fontFamily="IBM Plex Mono, ui-monospace, monospace"
            >
              {g.toFixed(2)}
            </text>
          </g>
        ))}
        {ticks.map((tick) => (
          <text
            key={tick.id}
            x={xAt(tick.t)}
            y={h - 8}
            textAnchor="middle"
            className="fill-muted"
            fontSize="9"
            fontFamily="IBM Plex Mono, ui-monospace, monospace"
          >
            {tick.label}
          </text>
        ))}
        <line x1={padL} x2={padL} y1={padT} y2={h - padB} stroke="currentColor" className="text-border" />
        <line
          x1={padL}
          x2={w - padR}
          y1={yAt(0.45)}
          y2={yAt(0.45)}
          stroke="var(--color-warn)"
          strokeOpacity="0.45"
          strokeDasharray="5 4"
        />
        {postPts ? (
          <polyline fill="none" stroke="var(--color-chrome)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={postPts} />
        ) : null}
        {prePts ? (
          <polyline fill="none" stroke="var(--color-crimson)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" points={prePts} />
        ) : null}
        {lastPost?.post != null ? (
          <circle cx={xAt(lastPost.t)} cy={yAt(lastPost.post)} r="3.2" fill="var(--color-chrome)" />
        ) : null}
        {lastPre?.pre != null ? (
          <circle cx={xAt(lastPre.t)} cy={yAt(lastPre.pre)} r="3.4" fill="var(--color-crimson)" />
        ) : null}
      </svg>
    </div>
  );
}
