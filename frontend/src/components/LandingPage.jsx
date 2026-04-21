import React, { useEffect, useRef, useState } from 'react';
import bgImage from '/imgg.jpg';

// Animated film-grain canvas overlay
function GrainOverlay() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const img = ctx.createImageData(w, h);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() * 25) | 0;
        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 14;
      }
      ctx.putImageData(img, 0, 0);
      frameRef.current = setTimeout(() => requestAnimationFrame(render), 80);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      clearTimeout(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 6,
        mixBlendMode: 'overlay',
      }}
    />
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = () => {
    window.location.href = '/edit';
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#07090d',
        overflow: 'hidden',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: '#fff',
      }}
    >
      {/* ── Grain ── */}
      <GrainOverlay />

      {/* ── Background photo — the London Bridge image, darkened ── */}
      {/* Place imgg.jpg in frontend/public/imgg.jpg */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundRepeat: 'no-repeat',
          // Heavily desaturate and darken the photo
          filter: 'brightness(0.22) saturate(0.4) contrast(1.1)',
          transform: 'scale(1.03)', // slight scale to avoid edge bleed
        }}
      />

      {/* ── Multi-layer gradient overlay to blend photo into dark bg ── */}
      {/* Bottom two-thirds fade to solid dark */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background:
            'linear-gradient(to bottom, rgba(7,9,13,0.05) 0%, rgba(7,9,13,0.4) 38%, rgba(7,9,13,0.82) 62%, rgba(7,9,13,0.97) 80%, #07090d 100%)',
        }}
      />
      {/* Radial vignette edges */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          background:
            'radial-gradient(ellipse 110% 100% at 50% 30%, transparent 35%, rgba(7,9,13,0.6) 75%, rgba(7,9,13,0.92) 100%)',
        }}
      />
      {/* Subtle blue tint cast from below */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '55%',
          zIndex: 3,
          background:
            'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(14,30,65,0.55) 0%, transparent 100%)',
        }}
      />

      {/* ── Subtle horizontal grid lines ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 4,
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.025) 1px, transparent 1px)',
          backgroundSize: '100% 56px',
        }}
      />

      {/* ── Main content — vertically centred, no extra top space ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          // Pull content very slightly above dead-centre so the photo
          // "backdrop" shows nicely above it
          marginTop: '-2vh',
        }}
      >

        {/* ── Eyebrow label ── */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-10px)',
            transition: 'opacity 0.6s ease 0.05s, transform 0.6s ease 0.05s',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              width: 32,
              height: 1,
              background: 'linear-gradient(to right, transparent, rgba(59,130,246,0.7))',
            }}
          />
          <span
            style={{
              fontFamily: "'DM Mono', 'Courier New', monospace",
              fontSize: 10,
              letterSpacing: '0.28em',
              color: '#3b82f6',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            Professional Image Editor
          </span>
          <div
            style={{
              width: 32,
              height: 1,
              background: 'linear-gradient(to left, transparent, rgba(59,130,246,0.7))',
            }}
          />
        </div>

        {/* ── Wordmark ── */}
        <h1
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(18px)',
            transition: 'opacity 0.75s ease 0.15s, transform 0.75s cubic-bezier(0.22,1,0.36,1) 0.15s',
            margin: 0,
            marginBottom: 16,
            fontSize: 'clamp(52px, 10vw, 96px)',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            background: 'linear-gradient(160deg, #ffffff 0%, #c8ddf0 45%, #5a9fd4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textAlign: 'center',
          }}
        >
          HYPERION
        </h1>

        {/* ── Thin ruled line ── */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.7s ease 0.28s',
            width: 'clamp(160px, 28vw, 320px)',
            height: 1,
            marginBottom: 20,
            background:
              'linear-gradient(to right, transparent, rgba(59,130,246,0.45) 30%, rgba(59,130,246,0.45) 70%, transparent)',
          }}
        />

        {/* ── Tagline ── */}
        <p
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.75s ease 0.32s, transform 0.75s ease 0.32s',
            margin: 0,
            marginBottom: 42,
            fontSize: 'clamp(13px, 1.5vw, 15px)',
            color: 'rgba(170,195,220,0.6)',
            letterSpacing: '0.07em',
            textAlign: 'center',
            maxWidth: 380,
            fontWeight: 400,
            lineHeight: 1.6,
          }}
        >
          Precision photo editing — every tone, every detail,<br />entirely under your control.
        </p>

        {/* ── CTA button ── */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.75s ease 0.45s, transform 0.75s ease 0.45s',
          }}
        >
          <button
            onClick={handleEnter}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 11,
              padding: '14px 40px',
              background: hovered
                ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                : 'linear-gradient(135deg, #1b45c8 0%, #162e8a 100%)',
              border: '1px solid rgba(99,163,255,0.3)',
              borderRadius: 3,
              color: '#fff',
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
              boxShadow: hovered
                ? '0 0 48px rgba(59,130,246,0.5), 0 6px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)'
                : '0 0 18px rgba(59,130,246,0.22), 0 3px 20px rgba(0,0,0,0.45)',
              transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
              overflow: 'hidden',
            }}
          >
            {/* Shimmer sweep on hover */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: hovered ? '120%' : '-60%',
                  width: '55%',
                  height: '100%',
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                  transition: 'left 0.45s ease',
                }}
              />
            </div>

            {/* Arrow icon */}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
              <path d="M4.5 6.5h4M6.5 4.5l2 2-2 2" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            Open Editor
          </button>
        </div>

        {/* ── Feature pills ── */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.9s ease 0.65s',
            marginTop: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {[
            { label: 'Non-destructive' },
            { label: 'GPU Accelerated' },
            { label: 'Local Processing' },
          ].map(({ label }, i) => (
            <React.Fragment key={label}>
              {i > 0 && (
                <div
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: 'rgba(59,130,246,0.35)',
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 10.5,
                  color: 'rgba(140,170,200,0.4)',
                  letterSpacing: '0.06em',
                  fontWeight: 400,
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Corner bracket accents ── */}
      {[
        { top: 18, left: 18 },
        { top: 18, right: 18 },
        { bottom: 18, left: 18 },
        { bottom: 18, right: 18 },
      ].map((pos, i) => {
        const isRight = 'right' in pos;
        const isBottom = 'bottom' in pos;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              ...pos,
              width: 16,
              height: 16,
              borderTop: isBottom ? 'none' : '1px solid rgba(59,130,246,0.28)',
              borderBottom: isBottom ? '1px solid rgba(59,130,246,0.28)' : 'none',
              borderLeft: isRight ? 'none' : '1px solid rgba(59,130,246,0.28)',
              borderRight: isRight ? '1px solid rgba(59,130,246,0.28)' : 'none',
              zIndex: 10,
              opacity: mounted ? 1 : 0,
              transition: `opacity 1s ease ${0.7 + i * 0.06}s`,
            }}
          />
        );
      })}

      {/* ── Fonts + keyframes ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
      `}</style>
    </div>
  );
}