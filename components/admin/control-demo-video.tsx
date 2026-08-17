export function ControlDemoVideo() {
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
          aria-label="Demostración de La Bocana Control"
        >
          Tu navegador no puede reproducir este vídeo.
        </video>
      </div>
      <p className="control-native-video-note">Reproducción directa en La Bocana · sin salir de la web</p>
    </div>
  );
}
