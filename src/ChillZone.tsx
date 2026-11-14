import { useEffect, useRef, useState, type PointerEvent } from "react";
import "./ChillZone.css";

const WIDTH = 760;
const HEIGHT = 420;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const TAU = Math.PI * 2;

type Mote = {
  radius: number;
  phase: number;
  speed: number;
  color: string;
  cooldown: number;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

export default function ChillZone() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 590, y: 210 });
  const collectedRef = useRef(0);
  const [collected, setCollected] = useState(0);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // Render sharply on high-resolution displays.
    // Match rendering resolution to the canvas's actual display size.
  const rect = canvas.getBoundingClientRect();

  const scaleX = Math.max(1, rect.width / WIDTH);
  const scaleY = Math.max(1, rect.height / HEIGHT);

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(WIDTH * scaleX * pixelRatio);
  canvas.height = Math.round(HEIGHT * scaleY * pixelRatio);

  ctx.setTransform(
    scaleX * pixelRatio,
    0,
    0,
    scaleY * pixelRatio,
    0,
    0
  );

    const colors = ["#79ebff", "#c49aff", "#ff9ce9", "#8fffd4", "#acb8ff"];
    const motes: Mote[] = Array.from({ length: 6 }, (_, index) => ({
      radius: 104 + index * 19,
      phase: index * 1.15,
      speed: (index % 2 ? -1 : 1) * (0.18 + index * 0.035),
      color: colors[index % colors.length],
      cooldown: 0,
    }));
    const sparks: Spark[] = [];
    let playerX = pointerRef.current.x;
    let playerY = pointerRef.current.y;
    let animationId = 0;
    let lastTime = 0;
    let elapsed = 0;
    const satelliteBirthTimes: number[] = [];

    const draw = (timestamp: number) => {
      const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0;
      lastTime = timestamp;
      elapsed += dt;

      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#10101b";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const atmosphere = ctx.createRadialGradient(CENTER_X, CENTER_Y, 20, CENTER_X, CENTER_Y, 290);
      atmosphere.addColorStop(0, "rgba(100, 67, 166, 0.15)");
      atmosphere.addColorStop(1, "rgba(100, 67, 166, 0)");
      ctx.fillStyle = atmosphere;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // A fixed star field keeps the background calm.
      for (let i = 0; i < 60; i++) {
        const x = (i * 163.7 + 53) % WIDTH;
        const y = (i * 97.3 + 19) % HEIGHT;
        ctx.globalAlpha = 0.16 + (i % 4) * 0.09;
        ctx.fillStyle = "#ded4ff";
        ctx.beginPath();
        ctx.arc(x, y, i % 8 === 0 ? 1.35 : 0.7, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Quiet orbital guides.
      ctx.save();
      ctx.translate(CENTER_X, CENTER_Y);
      ctx.rotate(-0.2);
      ctx.strokeStyle = "rgba(163, 130, 223, 0.2)";
      ctx.lineWidth = 1;
      for (const radius of [108, 146, 184, 220]) {
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius * 0.68, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();

      // Obsidian planet.
      const planet = ctx.createRadialGradient(CENTER_X - 28, CENTER_Y - 32, 3, CENTER_X, CENTER_Y, 83);
      planet.addColorStop(0, "#3d3b5b");
      planet.addColorStop(0.45, "#17182d");
      planet.addColorStop(1, "#070711");
      ctx.shadowColor = "rgba(166, 119, 255, 0.32)";
      ctx.shadowBlur = 26;
      ctx.fillStyle = planet;
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, 95, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(182, 167, 235, 0.45)";
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.beginPath();
      ctx.ellipse(CENTER_X - 26, CENTER_Y - 29, 7, 12, -0.5, 0, TAU);
      ctx.fill();

      
      // Captured stardust gradually joins the orbit.
      const satelliteCount = Math.min(collectedRef.current, 100);

      for (let i = 0; i < satelliteCount; i++) {
        const angle = elapsed * 0.15 + i * 2.399963229728653;

        const radius = [146, 184, 220][i % 3];

        // How long this particle has been in orbit.
        const birthTime = satelliteBirthTimes[i] ?? elapsed;
        const age = Math.max(0, elapsed - birthTime);

        // Smoothly fade and grow into place.
        const progress = Math.min(age / 0.8, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        const x = CENTER_X + Math.cos(angle) * radius;
        const y = CENTER_Y + Math.sin(angle) * radius * 0.68;

        ctx.save();

        ctx.globalAlpha = eased;
        ctx.shadowColor = colors[i % colors.length];
        ctx.shadowBlur = 12;
        ctx.fillStyle = colors[i % colors.length];

        ctx.beginPath();
        ctx.arc(x, y, 2.6 * eased, 0, TAU);
        ctx.fill();

        ctx.restore();
      }


      // Smoothly steer the player toward the pointer.
      const smoothing = 1 - Math.exp(-dt * 8);
      playerX += (pointerRef.current.x - playerX) * smoothing;
      playerY += (pointerRef.current.y - playerY) * smoothing;

      // Collect drifting stardust by moving your light close to it.
      motes.forEach((mote) => {
        mote.cooldown = Math.max(0, mote.cooldown - dt);
        const angle = mote.phase + elapsed * mote.speed;
        const x = CENTER_X + Math.cos(angle) * mote.radius;
        const y = CENTER_Y + Math.sin(angle) * mote.radius * 0.68;

        if (mote.cooldown === 0 && Math.hypot(x - playerX, y - playerY) < 22) {
          mote.cooldown = 1.1;
          mote.phase += 1.9;
          collectedRef.current += 1;

          // Record when this particle joins the orbit.
          satelliteBirthTimes.push(elapsed);
          setCollected(collectedRef.current);
          for (let i = 0; i < 10; i++) {
            const burstAngle = (i / 10) * TAU;
            sparks.push({
              x,
              y,
              vx: Math.cos(burstAngle) * (45 + i * 5),
              vy: Math.sin(burstAngle) * (45 + i * 5),
              life: 0.6,
              color: mote.color,
            });
          }
        }

        if (mote.cooldown === 0) {
  const pulse = 1 + Math.sin(elapsed * 3 + mote.phase) * 0.15;

  ctx.save();

          // Soft outer halo.
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = mote.color;
            ctx.beginPath();
            ctx.arc(x, y, 12 * pulse, 0, TAU);
            ctx.fill();

            // Bright glowing particle.
            ctx.globalAlpha = 1;
            ctx.shadowColor = mote.color;
            ctx.shadowBlur = 24;
            ctx.fillStyle = mote.color;
            ctx.beginPath();
            ctx.arc(x, y, 6 * pulse, 0, TAU);
            ctx.fill();

            // Small white center.
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(x, y, 2.2, 0, TAU);
            ctx.fill();

            ctx.restore();
          }
       });

      for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i];
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.life -= dt;
        if (spark.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = spark.life / 0.6;
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, 2, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Your controllable glowing comet.
      ctx.shadowColor = "#9df4ff";
      ctx.shadowBlur = 25;
      ctx.fillStyle = "#a0f2ff";
      ctx.beginPath();
      ctx.arc(playerX, playerY, 7 + Math.sin(elapsed * 3) * 0.8, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(170, 241, 255, 0.45)";
      ctx.beginPath();
      ctx.arc(playerX, playerY, 14, 0, TAU);
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [round]);

  const movePointer = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };

  const restart = () => {
    collectedRef.current = 0;
    setCollected(0);
    pointerRef.current = { x: 590, y: 210 };
    setRound((value) => value + 1);
  };

  return (
    <section className="zen-page">
      <div className="zen-heading">
        <div>
          <span className="zen-eyebrow">✧ YOUR MOMENT OF CALM</span>
          <h1>Zen Orbit</h1>
          <p>Take a breather. Guide your light through the drifting stardust.</p>
        </div>
        <button type="button" className="zen-reset" onClick={restart}>
          ↻ Reset
        </button>
      </div>

      <div className="zen-panel">
        <div className="zen-panel-header">
          <div><span className="zen-status-dot" /> Peaceful mode</div>
          <div className="zen-score">✦ {collected} collected</div>
        </div>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="zen-canvas"
          onPointerMove={movePointer}
          onPointerDown={movePointer}
          aria-label="Zen Orbit game: move your pointer or finger to collect glowing stardust"
        />
        <div className="zen-panel-footer">
          <span>Move your mouse or drag your finger to collect the drifting lights.</span>
          <span>No timer. No pressure.</span>
        </div>
      </div>
    </section>
  );
}
