function buildMapInto(svgId, areaId, options = {}) {
  const el  = document.getElementById(areaId);
  const W   = el.clientWidth;
  const H   = el.clientHeight;

  const svg = d3.select(`#${svgId}`);
  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const countries = topojson.feature(worldTopo, worldTopo.objects.countries);
  const borders   = topojson.mesh(worldTopo, worldTopo.objects.countries, (a, b) => a !== b);

  const proj = d3.geoNaturalEarth1()
    .fitExtent([[10, 10], [W - 10, H - 10]], countries);
  const path = d3.geoPath().projection(proj);

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
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [W, H]])
    .on('zoom', (event) => g.attr('transform', event.transform));

  svg.call(zoom).on('dblclick.zoom', null);
  return { zoom, svgSel: svg };
}

function zoomBy(svgSel, zoom, factor) {
  if (svgSel && zoom) svgSel.transition().duration(250).call(zoom.scaleBy, factor);
}

function zoomToCountry(id) {
  const path = document.getElementById(`c${id}`);
  if (!path || !gSvgSel || !gZoom) return;
  const el = document.getElementById('map-area');
  const W = el.clientWidth;
  const H = el.clientHeight;
  try {
    const b = path.getBBox();
    if (b.width === 0 && b.height === 0) return;
    const pad = 160;
    const scale = Math.min(5, Math.min(W / (b.width + pad * 2), H / (b.height + pad * 2)));
    const tx = (W - scale * (b.x * 2 + b.width)) / 2;
    const ty = (H - scale * (b.y * 2 + b.height)) / 2;
    gSvgSel.transition().duration(900)
      .call(gZoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  } catch (e) {}
}

function zoomToContinent() {
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
  const scale = Math.min(10, Math.min(W / (maxX - minX + pad * 2), H / (maxY - minY + pad * 2)));
  const tx = (W - scale * (minX + maxX)) / 2;
  const ty = (H - scale * (minY + maxY)) / 2;

  gSvgSel.transition().duration(800)
    .call(gZoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}
