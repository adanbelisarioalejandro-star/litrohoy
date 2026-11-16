// Acumula avisos en aviso.md; si el workflow falla, se abre un issue con su contenido.
import { appendFileSync } from 'node:fs';
export function aviso(titulo, detalle, accion, fichero = process.env.AVISO_FILE ?? 'aviso.md') {
  appendFileSync(fichero, `### ${titulo}\n\n\`\`\`\n${detalle}\n\`\`\`\n\n**Qué hacer:** ${accion}\n\n`);
}
