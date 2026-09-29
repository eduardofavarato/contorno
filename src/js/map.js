function buildMapInto(svgId, areaId, options = {}) {
  const el  = document.getElementById(areaId);
  const W   = el.clientWidth;
  const H   = el.clientHeight;

  const svg = d3.select(`#${svgId}`);
  svg.selectAll('*').remove();
  svg.node().refocus = null;
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const countries = topojson.feature(worldTopo, worldTopo.objects.countries);
  const borders   = topojson.mesh(worldTopo, worldTopo.objects.countries, (a, b) => a !== b);

  const proj = d3.geoNaturalEarth1()
    .fitExtent([[10, 10], [W - 10, H - 10]], countries);
  const path = d3.geoPath().projection(proj);
  svg.node().geoPath = path;

  const g = svg.append('g');

  g.append('path').datum({ type: 'Sphere' })
   .attr('fill', 'var(--ocean)').attr('d', path);

  g.append('path').datum(d3.geoGraticule()())
   .attr('fill', 'none').attr('stroke', '#111c2b')
   .attr('stroke-width', .4).attr('d', path);

  const paths = g.selectAll('.cp')
    .data(countries.features)
    .join('path')
    .attr('class', 'cp')
    .attr('id', d => `${options.prefix || 'c'}${+d.id}`)
    .attr('d', path)
    .attr('fill', d => options.fillFn ? options.fillFn(+d.id) : 'var(--land)')
    .attr('stroke', 'var(--land-bdr)')
    .attr('stroke-width', .5);

  if (options.onCountryClick) {
    paths.on('click', (event, d) => {
      event.stopPropagation();
      options.onCountryClick(+d.id);
    });
  }
  if (options.onCountryHover) {
    paths
      .on('mouseover', (event, d) => options.onCountryHover(+d.id, event, 'over'))
      .on('mousemove', (event, d) => options.onCountryHover(+d.id, event, 'move'))
      .on('mouseout',  (event, d) => options.onCountryHover(+d.id, event, 'out'));
  }

  g.append('path').datum(borders)
   .attr('fill', 'none').attr('stroke', 'var(--land-bdr)')
   .attr('stroke-width', .3).attr('d', path);

  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .translateExtent([[0, 0], [W, H]])
    .on('zoom', (event) => g.attr('transform', event.transform));

  svg.call(zoom).on('dblclick.zoom', null);
  keepMapFittedToArea(el, svg);
  return { zoom, svgSel: svg };
}

/**
 * The on-screen keyboard shrinks the map area (height only). Resize the viewBox with it and re-center whatever was
 * in focus, so the country stays centered in the part of the map the keyboard doesn't cover.
 */
function keepMapFittedToArea(el, svg) {
  el.mapResizeObserver?.disconnect();
  let timer;
  const observer = new ResizeObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const W = el.clientWidth, H = el.clientHeight;
      if (!W || !H) return;
      svg.attr('viewBox', `0 0 ${W} ${H}`);
      svg.node().refocus?.();
    }, 150);
  });
  observer.observe(el);
  el.mapResizeObserver = observer;
}

function zoomBy(svgSel, zoom, factor) {
  if (svgSel && zoom) svgSel.transition().duration(250).call(zoom.scaleBy, factor);
}

function zoomToCountryOn(id, prefix, svgSel, zoom, areaId, duration = 900) {
  const path = document.getElementById(`${prefix}${id}`);
  if (!path || !svgSel || !zoom) return;
  svgSel.node().refocus = () => zoomToCountryOn(id, prefix, svgSel, zoom, areaId, 300);
  const el = document.getElementById(areaId);
  const W = el.clientWidth, H = el.clientHeight;
  try {
    const b = mainlandBounds(path, svgSel.node().geoPath);
    if (b.width === 0 && b.height === 0) return;
    const pad = Math.min(W, H) * 0.1;
    const scale = Math.min(15, Math.min(W / (b.width + pad * 2), H / (b.height + pad * 2)));
    const tx = (W - scale * (b.x * 2 + b.width)) / 2;
    const ty = (H - scale * (b.y * 2 + b.height)) / 2;
    svgSel.transition().duration(duration)
      .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  } catch (e) {}
}

/**
 * Bounds of the country's largest landmass: France's full box spans the Indian Ocean and the Caribbean, which would
 * center the zoom somewhere in Africa.
 */
function mainlandBounds(pathEl, geoPath) {
  const feature = d3.select(pathEl).datum();
  if (!geoPath || feature?.geometry?.type !== 'MultiPolygon') return pathEl.getBBox();
  const largest = feature.geometry.coordinates
    .map(coordinates => ({ type: 'Polygon', coordinates }))
    .reduce((best, polygon) => (d3.geoArea(polygon) > d3.geoArea(best) ? polygon : best));
  const [[x0, y0], [x1, y1]] = geoPath.bounds(largest);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function zoomToCountry(id)          { zoomToCountryOn(id, 'c', gSvgSel, gZoom, 'map-area'); }
function zoomToCountryDuel(id)      { zoomToCountryOn(id, 'd', dSvgSel, dZoom, 'duel-map-area'); }
function zoomToCountryLocalizar(id) { zoomToCountryOn(id, 'l', lSvgSel, lZoom, 'localizar-map-area'); }

function zoomToContinent(duration = 800) {
  gSvgSel.node().refocus = () => zoomToContinent(300);
  const cont = CONTINENT_POOLS[selectedContinent];
  const el = document.getElementById('map-area');
  const W = el.clientWidth;
  const H = el.clientHeight;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  cont.ids.forEach(id => {
    const path = document.getElementById(`c${id}`);
    if (!path) return;
    try {
      const b = path.getBBox();
      if (b.width === 0 && b.height === 0) return;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    } catch (e) {}
  });

  if (minX === Infinity) return;

  const pad = 30;
  const scale = Math.min(15, Math.min(W / (maxX - minX + pad * 2), H / (maxY - minY + pad * 2)));
  const tx = (W - scale * (minX + maxX)) / 2;
  const ty = (H - scale * (minY + maxY)) / 2;

  gSvgSel.transition().duration(duration)
    .call(gZoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}
