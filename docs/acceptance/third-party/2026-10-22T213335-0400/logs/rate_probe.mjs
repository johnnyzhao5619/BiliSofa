import { RateObservation } from '/Users/weijiazhao/Dev/BiliSofa/packages/media/src/rate-observation.ts';
const rates = [.25,.5,.75,1,1.25,1.5,1.75,2];
for (const expected of rates) {
  const row = [];
  for (const actual of rates) {
    const o = new RateObservation(expected, 0);
    for (let w = 1200; w <= 6400; w += 500) o.add(w, (w) * actual);
    if (o.result().matched) row.push(actual);
  }
  console.log(`expected ${expected}: matched actual rates = ${row.join(', ')}`);
}
