import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#173127', color: '#fbf8f1' }}>
      <div style={{ width: 132, height: 132, border: '3px solid #d7c49d', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia', fontSize: 54, letterSpacing: 4 }}>
        LB
      </div>
    </div>,
    size,
  );
}
