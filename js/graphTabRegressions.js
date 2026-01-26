// regressions.js

export const regressions = [
  {
    id:     "powerLaw",
    label:  "Power-Law Fit",
    color:  "#ff0000",
    width:  3,
    r2: 0,
    A: 0,
    B: 0,
    C: 0,
    compute: function(xs) {
      return xs.map(x => this.A * Math.pow(x, -this.B) + this.C);
    }
  },
  {
    id:     "logLog",
    label:  "Log-Log Fit",
    color:  "#000000",
    width:  2,
    r2: 0,
    A: 0,
    B: 0,
    compute: function(xs) {
    return xs.map(x => this.A * Math.pow(x, this.B));
     
    }
  },
  {
    id:     "logarithmic",
    label:  "Logarithmic Fit",
    color:  "#00aa00",
    width:  2,
    r2: 0,
    A: 0,
    B: 0,
    compute: function(xs) {
      //return xs.map(x => this.A * Math.exp(this.B * x));
      return xs.map(x => this.A + this.B * Math.log(x))
    }
  },
];

/*
  Performs logarithmic regression: y = a + b * ln(x)

  Inputs:
    - yData: array of Y values
    - xData: array of X values (same length as yData)
  Notes:
    - Pairs are filtered together: only finite x/y are kept.
    - Requires x > 0 for ln(x).
*/
export function logarithmicRegression(yData, xData) {
  if (!Array.isArray(yData) || !Array.isArray(xData)) {
    throw new Error("logarithmicRegression expects (yData, xData) arrays.");
  }
  if (yData.length !== xData.length) {
    throw new Error("xData and yData must have the same length.");
  }

  // Build valid (x,y) pairs
  const points = [];
  for (let i = 0; i < yData.length; i++) {
    const x = xData[i];
    const y = yData[i];

    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x <= 0) throw new Error("Logarithmic regression requires x > 0.");

    points.push({ x, y });
  }

  const n = points.length;
  if (n < 2) {
    throw new Error("At least two valid (x,y) data points are required.");
  }

  // Accumulate for linear least squares in terms of L = ln(x)
  let sumLx = 0, sumY = 0, sumLx2 = 0, sumLxY = 0;
  for (const { x, y } of points) {
    const lx = Math.log(x);
    sumLx  += lx;
    sumY   += y;
    sumLx2 += lx * lx;
    sumLxY += lx * y;
  }

  const denom = n * sumLx2 - sumLx * sumLx;
  if (denom === 0) {
    throw new Error("Cannot compute regression (all ln(x) values identical?).");
  }

  // Solve for a, b
  const b = (n * sumLxY - sumLx * sumY) / denom;
  const a = (sumY - b * sumLx) / n;

  // R^2 computed over the SAME filtered points
  const mean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const { x, y } of points) {
    const yHat = a + b * Math.log(x);
    const diffRes = y - yHat;
    const diffTot = y - mean;
    ssRes += diffRes * diffRes;
    ssTot += diffTot * diffTot;
  }
  const r2 = ssTot === 0 ? 1 : (1 - ssRes / ssTot);

  regressions[2].A = a;
  regressions[2].B = b;
  logarithmicR2.innerText = r2.toFixed(3);

  // (Optional) return results too, in case you want to use it elsewhere
  return { a, b, r2, n };
}

/**
 * Fit RT = a * P^(-b) + c  to (x,y) pairs.
 *
 * @param {number[]} yData – array of response times (>= 0 typically)
 * @param {number[]} xData – array of P values (must be > 0 where used)
 * @param {object}   [opt] – { iterations: 1000, learningRate: 1e-6 }
 * @returns {{a:number, b:number, c:number, r2:number, n:number}}
 */
export function powerLawFit(yData, xData, opt = {}) {
  if (!Array.isArray(yData) || !Array.isArray(xData)) {
    throw new Error("powerLawFit expects (yData, xData, opt).");
  }
  if (yData.length !== xData.length) {
    throw new Error("xData and yData must have the same length.");
  }

  // Filter valid pairs together
  const x = [];
  const y = [];
  for (let i = 0; i < yData.length; i++) {
    const xi = xData[i];
    const yi = yData[i];
    if (!Number.isFinite(xi) || !Number.isFinite(yi)) continue;
    if (xi <= 0) throw new Error("Power law fit requires x > 0.");
    x.push(xi);
    y.push(yi);
  }

  const n = y.length;
  if (n < 3) throw new Error("Need at least 3 valid (x,y) points");

  // 1) Closed-form starting guess (linearize with ln)
  let fastest = Infinity;
  for (let i = 0; i < n; i++) if (y[i] < fastest) fastest = y[i];
  let c = Number.isFinite(fastest) ? fastest : 0;

  // Precompute ln(x)
  const lnX = x.map(Math.log);

  // ln(y - c) can be problematic if y == c; clamp
  const lnY = y.map(v => Math.log(Math.max(v - c, 1e-12)));

  const sum = arr => arr.reduce((s, v) => s + v, 0);
  const Sx  = sum(lnX);
  const Sy  = sum(lnY);
  const Sxx = sum(lnX.map(v => v * v));
  const Sxy = sum(lnX.map((v, i) => v * lnY[i]));

  const denom0 = n * Sxx - Sx * Sx;
  if (denom0 === 0) {
    throw new Error("Cannot compute initial guess (all ln(x) identical?).");
  }

  const slope = (n * Sxy - Sx * Sy) / denom0; // = -b
  const intercept = (Sy - slope * Sx) / n;    // = ln(a)

  let a = Math.exp(intercept);
  let b = -slope;

  // 2) Gradient descent refinement
  const iters = opt.iterations ?? 1000;
  const lr    = opt.learningRate ?? 1e-6;
  const clip  = 1e6;

  for (let k = 0; k < iters; k++) {
    let gA = 0, gB = 0, gC = 0;

    for (let i = 0; i < n; i++) {
      const xi = x[i];
      const yi = y[i];
      const xiNegB = Math.pow(xi, -b);
      const yhat   = a * xiNegB + c;
      const diff   = yhat - yi;

      gA += 2 * diff * xiNegB;
      gB += 2 * diff * a * xiNegB * (-lnX[i]);
      gC += 2 * diff;
    }

    const gNorm = Math.hypot(gA, gB, gC);
    if (gNorm > clip) {
      const s = clip / gNorm;
      gA *= s; gB *= s; gC *= s;
    }

    const lrDecayed = lr / Math.sqrt(k + 1);
    a -= lrDecayed * gA;
    b -= lrDecayed * gB;
    c -= lrDecayed * gC;

    if (Math.max(Math.abs(lrDecayed * gA), Math.abs(lrDecayed * gB), Math.abs(lrDecayed * gC)) < 1e-12) break;
  }

  // R^2 over filtered points
  const mean = y.reduce((s, v) => s + v, 0) / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yHat = a * Math.pow(x[i], -b) + c;
    const diff = yHat - y[i];
    ssRes += diff * diff;
    ssTot += (y[i] - mean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : (1 - ssRes / ssTot);

  regressions[0].r2 = r2;
  regressions[0].A = a;
  regressions[0].B = b;
  regressions[0].C = c;

  powerLawR2.innerText = r2.toFixed(3);

  return { a, b, c, r2, n };
}

/**
 * Log–log regression on (x,y) pairs (x>0, y>0).
 * Models: y ≈ A * x^B  => ln(y) = ln(A) + B ln(x)
 *
 * @param {number[]} yData
 * @param {number[]} xData
 * @returns {{A:number, B:number, r2:number, n:number}}
 */
export function logLogRegression(yData, xData) {
  if (!Array.isArray(yData) || !Array.isArray(xData)) {
    throw new Error("logLogRegression expects (yData, xData).");
  }
  if (yData.length !== xData.length) {
    throw new Error("xData and yData must have the same length.");
  }

  const logX = [];
  const logY = [];
  const ptsX = [];
  const ptsY = [];

  for (let i = 0; i < yData.length; i++) {
    const x = xData[i];
    const y = yData[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x <= 0) throw new Error("Log-log regression requires x > 0.");
    if (y <= 0) continue; // skip non-positive y (cannot log)

    ptsX.push(x);
    ptsY.push(y);
    logX.push(Math.log(x));
    logY.push(Math.log(y));
  }

  const n = logX.length;
  if (n < 2) {
    throw new Error("Need at least two positive (x,y) points to regress.");
  }

  const sumX  = logX.reduce((a, b) => a + b, 0);
  const sumY  = logY.reduce((a, b) => a + b, 0);
  const sumXY = logX.reduce((a, xi, i) => a + xi * logY[i], 0);
  const sumXX = logX.reduce((a, xi) => a + xi * xi, 0);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) {
    throw new Error("Cannot compute regression (all ln(x) values identical?).");
  }

  const B = (n * sumXY - sumX * sumY) / denom;
  const C = (sumY - B * sumX) / n; // C = ln(A)
  const A = Math.exp(C);

  regressions[1].A = A;
  regressions[1].B = B;

  // R^2 computed over the SAME filtered points (in original y-space)
  const mean = ptsY.reduce((s, v) => s + v, 0) / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yHat = A * Math.pow(ptsX[i], B);
    const diff = yHat - ptsY[i];
    ssRes += diff * diff;
    ssTot += (ptsY[i] - mean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : (1 - ssRes / ssTot);

  loglogR2.innerText = r2.toFixed(3);

  return { A, B, r2, n };
}

