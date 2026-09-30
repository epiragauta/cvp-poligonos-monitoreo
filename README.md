# Visor de Polígonos de Monitoreo — CVP Reasentamientos

Aplicación web (mapa) para visualizar los **puntos (predios)** y los **polígonos de monitoreo**
de la Dirección de Reasentamientos de la Caja de la Vivienda Popular (CVP).

Construida con **Leaflet** + **Vite** (JavaScript puro), pensada para desplegarse como sitio
estático en **Vercel**.

## Funcionalidades

- **16.769 puntos** de predios con *clustering* (agrupamiento por zoom) para un render fluido.
- **127 polígonos de monitoreo** (envolventes *concave hull* por sector).
- **Filtro por polígono**: selector que filtra los puntos, resalta el polígono y hace zoom.
- **Popups** con atributos: identificador REAS, dirección, polígono y origen del dato en los
  puntos; nombre, nº de puntos, área (ha) y método en los polígonos.
- Basemap OpenStreetMap (con CARTO claro como alternativa en el control de capas).
- Identidad visual institucional CVP.

## Datos

Los datos se sirven como GeoJSON estático desde `public/data/`:

| Archivo | Contenido |
|---|---|
| `puntos_monitoreo.geojson` | 16.769 puntos (16.482 del Excel origen + 287 recuperados de `expedientes_depurados`), EPSG:4326 |
| `poligonos_monitoreo.geojson` | 127 polígonos, EPSG:4326 |

Se generaron a partir de `Poligonos_Monitoreo/Procesos_REAS_Poligonos_Monitoreo.gpkg`
(coordenadas originales en el sistema plano local "origen Bogotá", reproyectadas a
coordenadas geográficas WGS84). El atributo `origen_coord` distingue los puntos recuperados.

## Desarrollo local

Requiere Node.js 18+ y npm.

> En este equipo Node está en `C:\software\node-v22.16.0-win-x64` (no en el PATH). Para
> usarlo en PowerShell: `$env:Path = "C:\software\node-v22.16.0-win-x64;" + $env:Path`

```bash
npm install       # instalar dependencias
npm run dev        # servidor de desarrollo (http://localhost:5173)
npm run build      # build de producción -> dist/
npm run preview    # previsualizar el build de producción
```

## Despliegue

### 1. Subir a GitHub

El repositorio remoto ya está definido:
`git@github.com:epiragauta/cvp-poligonos-monitoreo.git`

```bash
# (el repo local ya está inicializado y con el commit inicial)
git remote -v                       # verificar que el remoto 'origin' esté configurado
git push -u origin main             # subir
```

Si aún no existe el repositorio en GitHub, créalo primero (vacío, sin README) en
<https://github.com/new> con el nombre `cvp-poligonos-monitoreo`.

### 2. Publicar en Vercel

1. Entra a <https://vercel.com/new> e **importa** el repositorio de GitHub.
2. Vercel detecta automáticamente el preset **Vite** (o se toma de `vercel.json`):
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Deploy**. Cada `git push` a `main` genera un nuevo despliegue.

## Estructura

```
webmap-poligonos-monitoreo/
├── public/data/            # GeoJSON estáticos (puntos y polígonos)
├── src/
│   ├── main.js             # lógica del mapa (Leaflet + cluster + filtro + popups)
│   └── style.css           # estilos + identidad CVP
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

## Notas

- Para volúmenes mucho mayores (>100k puntos) conviene migrar a *vector tiles* (p. ej. PMTiles).
- Uso de teselas OpenStreetMap sujeto a su [política de uso](https://operations.osmfoundation.org/policies/tiles/);
  para tráfico alto, usar un proveedor de teselas con plan adecuado.
