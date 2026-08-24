// Glicko-2 Rating System Implementation

const SCALE = 173.7178, // GLICKO2_SCALE
 PHI = 350, // Initial RD
 SIGMA = 0.06, // Initial volatility
 TAU = 0.5, // System volatility
 EPSILON = 0.000001

export interface Rating {
  rating: number // Μ in Glicko-2 scale
  rd: number // Φ
  volatility: number // Σ
  gamesPlayed: number
}

export function createInitialRating(): Rating {
  return {
    gamesPlayed: 0,
    rating: 0, // 1500 in Glicko scale
    rd: PHI,
    volatility: SIGMA,
  }
}

export function glickoToDisplay(rating: number): number {
  return SCALE * rating + 1500
}

export function displayToGlicko(display: number): number {
  return (display - 1500) / SCALE
}

// Glicko-2 math functions
function g(phi: number): number {
  return 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI))
}

function E(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)))
}

function computeV(opponents: { rating: number; rd: number }[], playerMu: number): number {
  let sum = 0
  for (const opp of opponents) {
    const gPhi = g(opp.rd),
     e = E(playerMu, opp.rating, opp.rd)
    sum += gPhi * gPhi * e * (1 - e)
  }
  return 1 / sum
}

function computeDelta(
  opponents: { rating: number; rd: number; score: number }[],
  playerMu: number,
  v: number
): number {
  let sum = 0
  for (const opp of opponents) {
    const gPhi = g(opp.rd),
     e = E(playerMu, opp.rating, opp.rd)
    sum += gPhi * (opp.score - e)
  }
  return v * sum
}

function computeNewVolatility(
  sigma: number,
  phi: number,
  v: number,
  delta: number
): number {
  const a = Math.log(sigma * sigma)
  const f = (x: number) => {
    const ex = Math.exp(x)
    const d2 = delta * delta
    const phi2 = phi * phi
    const vNew = 1 / (1 / (ex * (phi2 + v + ex)) + 1 / ex)
    return (
      vNew * (d2 - phi2 - v - ex) -
      x -
      2 * Math.log(1 + Math.exp(-x + a))
    ) / (2 * Math.pow(phi2 + v + ex, 2))
  }

  // Find bounds for bisection
  if (f(a) < 0) {
    let upper = a
    while (f(upper) < 0) {upper += 1}
  } else {
    let lower = a
    while (f(lower) > 0) {lower -= 1}
  }

  // Iterative algorithm (simplified)
  let x = a
  for (let i = 0; i < 100; i++) {
    const ex = Math.exp(x),
     d2 = delta * delta,
     phi2 = phi * phi,
     vNew = 1 / (1 / (ex * (phi2 + v + ex)) + 1 / ex),
     fx =
      (vNew * (d2 - phi2 - v - ex)) /
        (2 * (phi2 + v + ex) ** 2) -
      (x - a) / (TAU * TAU) -
      1 +
      2 * Math.log(1 + Math.exp(x - a))

    if (Math.abs(fx) < EPSILON) {break}

    // Newton step
    const term = Math.exp(x) * (d2 - phi2 - v - Math.exp(x)),
     denom = (phi2 + v + Math.exp(x)) ** 2
    const dfx = term / (2 * denom) - 1 / (TAU * TAU) - 1

    x -= fx / dfx
  }

  return Math.exp(x / 2)
}

export function updateRating(
  player: Rating,
  opponents: { rating: number; rd: number; score: number }[]
): Rating {
  if (opponents.length === 0) {
    // No games played, RD increases
    const newRd = Math.min(Math.sqrt(player.rd * player.rd + player.volatility * player.volatility), PHI)
    return {
      ...player,
      gamesPlayed: player.gamesPlayed + opponents.length,
      rd: newRd,
    }
  }

  // Convert to Glicko-2 scale
  const mu = player.rating,
   phi = player.rd / SCALE,

  // Compute v (information quantity)
   v = computeV(opponents, mu),

  // Compute delta (performance)
   delta = computeDelta(opponents, mu, v),

  // Compute new volatility
   newSigma = computeNewVolatility(player.volatility, phi, v, delta),

  // Compute new RD
   phiStar = Math.sqrt(phi * phi + newSigma * newSigma),
   newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)

  // Compute new rating
  let ratingSum = 0
  for (const opp of opponents) {
    const gPhi = g(opp.rd),
     e = E(mu, opp.rating, opp.rd)
    ratingSum += gPhi * (opp.score - e)
  }
  const newMu = mu + (newPhi * newPhi) * ratingSum

  return {
    gamesPlayed: player.gamesPlayed + opponents.length,
    rating: newMu,
    rd: newPhi * SCALE,
    volatility: newSigma,
  }
}
