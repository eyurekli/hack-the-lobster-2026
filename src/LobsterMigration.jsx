import { useEffect, useRef } from "react";
import { scoreToColor } from "./colorScale.js";

// Migration flows: particles travel from SOURCE → DEST when source is declining relative to dest.
// Each flow has a set of waypoints in [lat, lng] that define the path.
const MIGRATION_FLOWS = [
  {
    id: "fundy-gulf",
    from: "Bay of Fundy",
    to: "Gulf of St. Lawrence",
    waypoints: [
      [45.0, -65.5],
      [45.8, -64.2],
      [46.4, -63.5],
      [47.0, -63.0],
      [47.8, -62.5],
      [48.2, -62.0],
    ],
  },
  {
    id: "scotian-gulf",
    from: "Scotian Shelf",
    to: "Gulf of St. Lawrence",
    waypoints: [
      [44.5, -62.0],
      [45.2, -62.5],
      [46.0, -63.0],
      [46.8, -62.5],
      [47.5, -62.0],
      [48.0, -62.0],
    ],
  },
  {
    id: "fundy-scotian",
    from: "Bay of Fundy",
    to: "Scotian Shelf",
    waypoints: [
      [44.9, -65.8],
      [44.6, -66.2],
      [44.3, -66.5],
      [43.0, -66.5],
      [43.0, -64.8],
      [44.0, -63.5],
      [43.8, -62.5],
      [43.5, -62.0],
    ],
  },
];

// Cubic bezier interpolation along waypoints
function catmullRomPoint(waypoints, t) {
  const n = waypoints.length - 1;
  const segment = Math.min(Math.floor(t * n), n - 1);
  const localT = t * n - segment;

  const p0 = waypoints[Math.max(0, segment - 1)];
  const p1 = waypoints[segment];
  const p2 = waypoints[Math.min(n, segment + 1)];
  const p3 = waypoints[Math.min(n, segment + 2)];

  const t2 = localT * localT;
  const t3 = t2 * localT;

  const lat =
    0.5 *
    (2 * p1[0] +
      (-p0[0] + p2[0]) * localT +
      (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
      (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);

  const lng =
    0.5 *
    (2 * p1[1] +
      (-p0[1] + p2[1]) * localT +
      (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
      (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);

  return [lat, lng];
}

// Compute screen direction angle at a point along the path
function pathAngle(waypoints, t, map) {
  const delta = 0.01;
  const t1 = Math.max(0, t - delta);
  const t2 = Math.min(1, t + delta);
  const [lat1, lng1] = catmullRomPoint(waypoints, t1);
  const [lat2, lng2] = catmullRomPoint(waypoints, t2);
  const p1 = map.latLngToContainerPoint([lat1, lng1]);
  const p2 = map.latLngToContainerPoint([lat2, lng2]);
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

function hexToRgb(color) {
  // handles rgb(...) strings from scoreToColor
  const m = color.match(/\d+/g);
  if (m) return { r: +m[0], g: +m[1], b: +m[2] };
  return { r: 34, g: 211, b: 238 };
}

export default function LobsterMigration({ map, scores, isPlaying }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);

  // Resize canvas to match map container
  useEffect(() => {
    if (!map) return;

    const container = map.getContainer();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sync = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    sync();

    map.on("resize", sync);
    return () => map.off("resize", sync);
  }, [map]);

  // Reposition canvas when map moves
  useEffect(() => {
    if (!map) return;
    const onMove = () => {
      // canvas is absolutely positioned in leaflet's pane — no offset needed
    };
    map.on("move zoom", onMove);
    return () => map.off("move zoom", onMove);
  }, [map]);

  // Build/refresh particles whenever the play button is pressed
  useEffect(() => {
    if (!map || !scores || Object.keys(scores).length === 0) return;

    const allParticles = [];

    MIGRATION_FLOWS.forEach((flow) => {
      const fromScore = scores[flow.from] ?? 0.5;
      const toScore = scores[flow.to] ?? 0.5;

      // Flow strength = difference in score (to - from), clamped to [0,1]
      const delta = toScore - fromScore;
      if (delta <= 0.02) return; // No meaningful migration on this path

      const strength = Math.min(1, delta * 3); // amplify
      const count = Math.floor(strength * 28) + 6; // 6–34 particles per flow

      const fromColor = hexToRgb(scoreToColor(fromScore));
      const toColor = hexToRgb(scoreToColor(toScore));

      for (let i = 0; i < count; i++) {
        allParticles.push({
          flow,
          // Stagger start positions so they're spread along the path
          t: Math.random(),
          speed: 0.0008 + Math.random() * 0.0006, // fraction of path per frame
          size: 2 + Math.random() * 2.5,
          alpha: 0.5 + Math.random() * 0.5,
          fromColor,
          toColor,
          strength,
        });
      }
    });

    particlesRef.current = allParticles;
  }, [isPlaying]);

  // Animation loop
  useEffect(() => {
    if (!map) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let running = true;

    const draw = () => {
      if (!running) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;

      // Group by flow for trail rendering
      const byFlow = {};
      particles.forEach((p) => {
        if (!byFlow[p.flow.id]) byFlow[p.flow.id] = [];
        byFlow[p.flow.id].push(p);
      });

      // Draw flow paths as faint guide lines
      Object.values(byFlow).forEach((group) => {
        if (group.length === 0) return;
        const { flow } = group[0];
        const pts = flow.waypoints.map((wp) => map.latLngToContainerPoint(wp));

        ctx.save();
        ctx.beginPath();
        pts.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });

        // Determine flow color from first particle's destination color
        const { toColor, strength } = group[0];
        ctx.strokeStyle = `rgba(${toColor.r},${toColor.g},${toColor.b},${0.08 * strength})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 8]);
        ctx.lineDashOffset = (Date.now() / 60) % 12; // animate dash
        ctx.stroke();
        ctx.restore();
      });

      // Draw particles
      particles.forEach((p) => {
        // Advance position
        p.t = (p.t + p.speed) % 1;

        const [lat, lng] = catmullRomPoint(p.flow.waypoints, p.t);
        const pt = map.latLngToContainerPoint([lat, lng]);

        // Skip if off-screen
        if (pt.x < -20 || pt.x > w + 20 || pt.y < -20 || pt.y > h + 20) return;

        const angle = pathAngle(p.flow.waypoints, p.t, map);

        // Fade in/out at ends
        const fade = p.t < 0.1 ? p.t / 0.1 : p.t > 0.9 ? (1 - p.t) / 0.1 : 1;
        const alpha = p.alpha * fade;

        // Color blends from source color → destination color along path
        const cr = Math.round(
          p.fromColor.r + (p.toColor.r - p.fromColor.r) * p.t,
        );
        const cg = Math.round(
          p.fromColor.g + (p.toColor.g - p.fromColor.g) * p.t,
        );
        const cb = Math.round(
          p.fromColor.b + (p.toColor.b - p.fromColor.b) * p.t,
        );

        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(angle);

        // Core emoji
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
        ctx.font = `${Math.max(p.size * 5, 12)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🦞", 0, 0);

        ctx.restore();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [map]);

  if (!map) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 500,
      }}
    />
  );
}
