// Proveedor de las teselas del mapa (componente Mapa y página de privacidad). Para cambiarlo: añade aquí su entrada
// (URL de teselas, atribución que exija su licencia, y su política de privacidad) y crea la variable del repositorio
// MAPA_PROVEEDOR con su clave. Ver DECISIONES.md, sección 10.
const PROVEEDORES = {
  // Política de uso: https://operations.osmfoundation.org/policies/tiles/ (revisada el 18-11-2026)
  osm: {
    nombre: 'OpenStreetMap',
    titular: 'OpenStreetMap Foundation, Reino Unido',
    teselas: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    atribucion: '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>',
    privacidad: 'https://osmfoundation.org/wiki/Privacy_Policy',
    corregir: 'https://www.openstreetmap.org/fixthemap',
  },
};
const clave = process.env.MAPA_PROVEEDOR || 'osm';
if (!PROVEEDORES[clave]) throw new Error(`MAPA_PROVEEDOR="${clave}" no existe en src/lib/mapa.mjs`);
export const MAPA = PROVEEDORES[clave];
