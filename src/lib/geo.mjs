// Códigos tal y como los usa la fuente (IDProvincia = código INE; IDCCAA = numeración del Ministerio).
export const CCAA = {
  '01': 'Andalucía', '02': 'Aragón', '03': 'Asturias', '04': 'Illes Balears', '05': 'Canarias', '06': 'Cantabria',
  '07': 'Castilla-La Mancha', '08': 'Castilla y León', '09': 'Cataluña', '10': 'Comunitat Valenciana', '11': 'Extremadura',
  '12': 'Galicia', '13': 'Comunidad de Madrid', '14': 'Región de Murcia', '15': 'Navarra', '16': 'País Vasco',
  '17': 'La Rioja', '18': 'Ceuta', '19': 'Melilla',
};

// provincia -> [nombre, ccaa]
export const PROVINCIAS = {
  '01': ['Álava', '16'], '02': ['Albacete', '07'], '03': ['Alicante', '10'], '04': ['Almería', '01'], '05': ['Ávila', '08'],
  '06': ['Badajoz', '11'], '07': ['Illes Balears', '04'], '08': ['Barcelona', '09'], '09': ['Burgos', '08'], '10': ['Cáceres', '11'],
  '11': ['Cádiz', '01'], '12': ['Castellón', '10'], '13': ['Ciudad Real', '07'], '14': ['Córdoba', '01'], '15': ['A Coruña', '12'],
  '16': ['Cuenca', '07'], '17': ['Girona', '09'], '18': ['Granada', '01'], '19': ['Guadalajara', '07'], '20': ['Gipuzkoa', '16'],
  '21': ['Huelva', '01'], '22': ['Huesca', '02'], '23': ['Jaén', '01'], '24': ['León', '08'], '25': ['Lleida', '09'],
  '26': ['La Rioja', '17'], '27': ['Lugo', '12'], '28': ['Madrid', '13'], '29': ['Málaga', '01'], '30': ['Murcia', '14'],
  '31': ['Navarra', '15'], '32': ['Ourense', '12'], '33': ['Asturias', '03'], '34': ['Palencia', '08'], '35': ['Las Palmas', '05'],
  '36': ['Pontevedra', '12'], '37': ['Salamanca', '08'], '38': ['Santa Cruz de Tenerife', '05'], '39': ['Cantabria', '06'],
  '40': ['Segovia', '08'], '41': ['Sevilla', '01'], '42': ['Soria', '08'], '43': ['Tarragona', '09'], '44': ['Teruel', '02'],
  '45': ['Toledo', '07'], '46': ['Valencia', '10'], '47': ['Valladolid', '08'], '48': ['Bizkaia', '16'], '49': ['Zamora', '08'],
  '50': ['Zaragoza', '02'], '51': ['Ceuta', '18'], '52': ['Melilla', '19'],
};

export const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
