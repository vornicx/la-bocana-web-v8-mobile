import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
login = root / 'app/admin-login/login-form.tsx'
css = root / 'app/admin-login/demo-access.css'
component = root / 'components/admin/control-demo-video.tsx'

text = login.read_text(encoding='utf-8')
text = text.replace("const DEMO_VIDEO_URL = 'https://www.canva.com/d/oaEej4P36GJOBoT';\n", '')

import_line = "import { ControlDemoVideo } from '@/components/admin/control-demo-video';\n"
anchor = "import { loginStaff, type LoginState } from './actions';\n"
if import_line not in text:
    if anchor not in text:
        raise SystemExit('Could not locate login-form import anchor')
    text = text.replace(anchor, anchor + import_line)

old = '''      <div className="control-demo-access control-demo-video-card" aria-label="Vídeo de demostración de Control">
        <div className="control-demo-access-head">
          <div>
            <span>Vídeo de demostración</span>
            <strong>Mira cómo funciona Control antes de entrar</strong>
          </div>
          <span className="control-demo-badge">1:34</span>
        </div>
        <p className="control-demo-video-copy">Un recorrido breve por reservas, sala, clientes y la operativa diaria de La Bocana.</p>
        <a className="control-demo-use" href={DEMO_VIDEO_URL} target="_blank" rel="noreferrer">
          Ver demostración
          <span aria-hidden="true">→</span>
        </a>
      </div>'''

if old not in text:
    raise SystemExit('Could not locate the Canva video card')
text = text.replace(old, '      <ControlDemoVideo />')
login.write_text(text, encoding='utf-8')

component.parent.mkdir(parents=True, exist_ok=True)
component.write_text('''export function ControlDemoVideo() {
  return (
    <div className="control-demo-access control-demo-video-card" aria-label="Vídeo de demostración de Control">
      <div className="control-demo-access-head">
        <div>
          <span>Vídeo de demostración</span>
          <strong>Mira cómo funciona Control antes de entrar</strong>
        </div>
        <span className="control-demo-badge">1:34</span>
      </div>
      <p className="control-demo-video-copy">Un recorrido breve por reservas, sala, clientes y la operativa diaria de La Bocana.</p>
      <div className="control-native-video-frame">
        <video
          className="control-native-video"
          src="/videos/demo-la-bocana.mp4"
          controls
          playsInline
          preload="metadata"
        >
          Tu navegador no puede reproducir este vídeo.
        </video>
      </div>
      <p className="control-native-video-note">Reproducción directa en La Bocana · sin salir de la web</p>
    </div>
  );
}
''', encoding='utf-8')

styles = css.read_text(encoding='utf-8')
marker = '/* Native Control demo video */'
if marker not in styles:
    styles += '''

/* Native Control demo video */
.control-native-video-frame {
  width: 100%;
  margin-top: 14px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 14px;
  background: #07151e;
  border: 1px solid rgba(16, 43, 61, 0.12);
  box-shadow: 0 14px 34px rgba(7, 21, 30, 0.14);
}

.control-native-video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #07151e;
}

.control-native-video-note {
  margin: 10px 0 0;
  color: rgba(16, 43, 61, 0.58);
  font-size: 11px;
  line-height: 1.45;
  letter-spacing: 0.015em;
}

@media (max-width: 640px) {
  .control-native-video-frame {
    margin-top: 12px;
    border-radius: 11px;
  }

  .control-native-video-note {
    font-size: 10px;
  }
}
'''
    css.write_text(styles, encoding='utf-8')

for path in [login, component, css]:
    if 'canva.com/d/oaEej4P36GJOBoT' in path.read_text(encoding='utf-8'):
        raise SystemExit(f'Canva URL remains in {path}')

print('Native demo player patch prepared successfully')
