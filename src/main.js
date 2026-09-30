import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './style.css';

// ===== Paleta CVP =====
const CVP = {
  rojo: '#be1e2d',
  marron: '#a85a28',
  ambar: '#ffbd47',
  dorado: '#d9a404',
};

const BASE = import.meta.env.BASE_URL; // './' en build, '/' en dev
const $ = (id) => document.getElementById(id);

// ===== Mapa =====
const map = L.map('map', { preferCanvas: true }).setView([4.62, -74.1], 11);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · CVP Reasentamientos',
});
// Alternativa de basemap claro (CARTO) — requiere su atribución si se activa:
const cartoLight = L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {
    maxZoom: 20,
    subdomains: 'abcd',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }
);
osm.addTo(map);

// ===== Estilos de polígonos =====
const estiloPoly = {
  color: CVP.rojo,
  weight: 1.5,
  opacity: 0.9,
  fillColor: CVP.rojo,
  fillOpacity: 0.08,
};
const estiloPolySel = {
  color: CVP.dorado,
  weight: 3,
  opacity: 1,
  fillColor: CVP.ambar,
  fillOpacity: 0.25,
};

let polyLayer = null;
let clusterGroup = null;
let todosLosMarkers = []; // { marker, nombre }
let totalPuntos = 0;

// ===== Popups =====
function popupPunto(p) {
  const recuperado = p.origen_coord === 'recuperado_gpkg';
  return `
    <div class="popup-title">${p['IDENTIFICADOR REAS'] || '(sin identificador)'}</div>
    <div class="popup-row"><span class="k">Dirección:</span> ${p['DIRECCION'] || '—'}</div>
    <div class="popup-row"><span class="k">Polígono:</span> ${p['nombre poligono'] || '—'} (ID ${p['ID poligono de monitoreo'] ?? '—'})</div>
    <div class="popup-row"><span class="k">Origen:</span> ${
      recuperado
        ? '<span class="badge">recuperado</span> expedientes_depurados'
        : 'Excel origen Bogotá'
    }</div>`;
}

function popupPoligono(p) {
  const ha = (Number(p.area_m2) / 10000).toFixed(2);
  return `
    <div class="popup-title">${p.nombre_poligono || '(sin nombre)'}</div>
    <div class="popup-row"><span class="k">ID polígono:</span> ${p.id_poligono}</div>
    <div class="popup-row"><span class="k">Puntos:</span> ${p.n_puntos}</div>
    <div class="popup-row"><span class="k">Área:</span> ${ha} ha</div>
    <div class="popup-row"><span class="k">Método:</span> ${p.metodo}</div>`;
}

// ===== Carga de datos =====
Promise.all([
  fetch(`${BASE}data/poligonos_monitoreo.geojson`).then((r) => r.json()),
  fetch(`${BASE}data/puntos_monitoreo.geojson`).then((r) => r.json()),
])
  .then(([poligonos, puntos]) => {
    // --- polígonos ---
    polyLayer = L.geoJSON(poligonos, {
      style: estiloPoly,
      onEachFeature: (f, layer) => layer.bindPopup(popupPoligono(f.properties)),
    }).addTo(map);

    // --- puntos (cluster) ---
    clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      disableClusteringAtZoom: 18,
    });

    puntos.features.forEach((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties;
      const marker = L.circleMarker([lat, lng], {
        radius: 4,
        color: '#fff',
        weight: 1,
        fillColor: CVP.marron,
        fillOpacity: 0.9,
      }).bindPopup(popupPunto(p));
      todosLosMarkers.push({ marker, nombre: p['nombre poligono'] });
    });
    totalPuntos = todosLosMarkers.length;

    clusterGroup.addLayers(todosLosMarkers.map((m) => m.marker));
    map.addLayer(clusterGroup);

    // --- control de capas ---
    L.control
      .layers(
        { OpenStreetMap: osm, 'CARTO claro': cartoLight },
        { 'Polígonos de monitoreo': polyLayer, 'Puntos (predios)': clusterGroup },
        { collapsed: true }
      )
      .addTo(map);

    // --- ajustar vista a los polígonos ---
    if (polyLayer.getBounds().isValid()) {
      map.fitBounds(polyLayer.getBounds(), { padding: [20, 20] });
    }

    poblarFiltro(puntos);
    actualizarStats(totalPuntos);
  })
  .catch((err) => {
    console.error('Error cargando datos:', err);
    $('stats').innerHTML = '<b>Error</b> al cargar los datos';
  });

// ===== Filtro por polígono =====
function poblarFiltro(puntos) {
  const nombres = [
    ...new Set(
      puntos.features.map((f) => f.properties['nombre poligono']).filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'es'));

  const sel = $('filtro');
  for (const n of nombres) {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => aplicarFiltro(sel.value));
  $('reset').addEventListener('click', () => {
    sel.value = '__all__';
    aplicarFiltro('__all__');
  });
}

function aplicarFiltro(nombre) {
  const todos = nombre === '__all__';
  const subset = todos
    ? todosLosMarkers
    : todosLosMarkers.filter((m) => m.nombre === nombre);

  clusterGroup.clearLayers();
  clusterGroup.addLayers(subset.map((m) => m.marker));

  // resaltar el polígono seleccionado
  let boundsSel = null;
  polyLayer.eachLayer((layer) => {
    const match = !todos && layer.feature.properties.nombre_poligono === nombre;
    layer.setStyle(match ? estiloPolySel : estiloPoly);
    if (match) {
      layer.bringToFront();
      boundsSel = layer.getBounds();
    }
  });

  // ajustar vista
  if (todos) {
    if (polyLayer.getBounds().isValid())
      map.fitBounds(polyLayer.getBounds(), { padding: [20, 20] });
  } else if (boundsSel && boundsSel.isValid()) {
    map.fitBounds(boundsSel, { padding: [40, 40], maxZoom: 17 });
  } else if (subset.length) {
    map.fitBounds(L.featureGroup(subset.map((m) => m.marker)).getBounds(), {
      padding: [40, 40],
      maxZoom: 17,
    });
  }

  actualizarStats(subset.length, todos ? null : nombre);
}

// ===== Stats =====
function actualizarStats(visibles, nombre) {
  const filtro = nombre ? ` · <i>${nombre}</i>` : '';
  $('stats').innerHTML =
    `<b>${visibles.toLocaleString('es-CO')}</b> puntos visibles ` +
    `de ${totalPuntos.toLocaleString('es-CO')}${filtro}`;
}
