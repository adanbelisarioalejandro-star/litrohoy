// ads.txt oficial de AdSense (support.google.com/adsense/answer/12169212). El ID sale de PUBLIC_ADSENSE_ID.
export function GET() {
  const id = (import.meta.env.PUBLIC_ADSENSE_ID ?? '').replace(/^ca-/, '');
  const cuerpo = /^pub-\d{10,20}$/.test(id)
    ? `google.com, ${id}, DIRECT, f08c47fec0942fa0\n`
    : '# Pendiente: se rellena automáticamente al definir PUBLIC_ADSENSE_ID (ver PENDIENTE.md)\n';
  return new Response(cuerpo);
}
