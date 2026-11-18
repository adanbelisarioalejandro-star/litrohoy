// Datos del titular (LSSI art. 10, responsable del tratamiento RGPD y contacto). No se escriben en el repositorio:
// llegan al compilar desde las variables de GitHub (Settings → Secrets and variables → Actions → Variables).
// Sin la variable se pinta un [RELLENAR], y el QC del bot bloquea la publicación si queda alguno (scripts/qc.mjs).
const v = (k, desc) => process.env[k]?.trim() || `[RELLENAR: ${desc} (variable ${k})]`;
export const TITULAR = {
  nombre: v('TITULAR_NOMBRE', 'nombre y apellidos o razón social'),
  nif: v('TITULAR_NIF', 'NIF/NIE'),
  domicilio: v('TITULAR_DOMICILIO', 'domicilio'),
  correo: v('TITULAR_CORREO', 'correo electrónico de contacto'),
};
