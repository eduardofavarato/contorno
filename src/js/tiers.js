const CONTINENT_POOLS = {
  sul:     { name: 'América do Sul',   ids: new Set([32,68,76,152,170,218,254,328,600,604,740,780,858,862]) },
  central: { name: 'América Central',  ids: new Set([84,188,192,214,222,320,332,340,388,558,591]) },
  norte:   { name: 'América do Norte', ids: new Set([124,304,484,840]) },
  europa:  { name: 'Europa',           ids: new Set([8,40,56,70,100,112,191,203,208,233,246,250,276,300,348,352,372,380,383,428,440,442,498,499,528,578,616,620,642,643,688,703,705,724,752,756,804,807,826]) },
  asia:    { name: 'Ásia',             ids: new Set([4,31,50,51,64,104,116,144,156,158,196,268,356,360,364,368,376,392,398,400,408,410,414,417,418,422,458,496,512,524,586,608,626,634,682,704,760,762,764,784,792,795,860,887]) },
  oceania: { name: 'Oceania',          ids: new Set([36,242,554,598]) },
};

function poolForLevel(level) {
  if (level === 1) return pool.filter(c => TIER1.has(c.id));
  if (level === 2) return pool.filter(c => TIER1.has(c.id) || TIER2.has(c.id));
  return pool;
}
