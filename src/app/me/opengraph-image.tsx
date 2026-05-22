import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'My War Record | TIFO';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#030712',
          fontFamily: 'sans-serif',
          color: '#ffffff',
          position: 'relative',
          padding: '56px 64px',
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #030712 0%, #1e1b4b 50%, #030712 100%)',
          }}
        />

        {/* Accent stripe on top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 6,
            background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
          }}
        />

        {/* Top section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            position: 'relative',
          }}
        >
          {/* TIFO badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 22,
              letterSpacing: 6,
              color: '#818cf8',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            TIFO
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.15,
              color: '#ffffff',
              marginTop: 8,
            }}
          >
            My War Record
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 28,
              color: '#a5b4fc',
              marginTop: 4,
            }}
          >
            Join the territory war on X Layer
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '14px 28px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              borderRadius: 14,
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: 22,
              color: '#e0e7ff',
            }}
          >
            <span style={{ fontWeight: 700, color: '#818cf8', fontSize: 28 }}>48</span>
            <span>Factions</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '14px 28px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              borderRadius: 14,
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: 22,
              color: '#e0e7ff',
            }}
          >
            <span style={{ fontWeight: 700, color: '#818cf8', fontSize: 28 }}>200</span>
            <span>Regions</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '14px 28px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              borderRadius: 14,
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: 22,
              color: '#e0e7ff',
            }}
          >
            <span>Every action on-chain</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: 20,
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 20,
              color: '#6b7280',
            }}
          >
            <span style={{ color: '#9ca3af', fontWeight: 600 }}>@0xWangyangming</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span>Built on X Layer</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
