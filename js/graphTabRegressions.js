// regressions.js
import { scanMax } from "./probabilities.js";

//the regressions that can be drawn on the graph; A, B and C are set by the fits below
export const regressions = [
  {
    id:     "powerLaw",
    label:  "Power-Law Fit",
    color:  "#ff0000",
    width:  3,
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
    A: 0,
    B: 0,
    compute: function(xs) {
      return xs.map(x => this.A + this.B * Math.log(x))
    }
  },
];

//the (x,y) pairs with finite values, also dropping y <= 0 when y will be logged; needs at least minN of them and x > 0
function validPairs(yData, xData, minN, positiveY = false) {
  if (!Array.isArray(yData) || !Array.isArray(xData) || yData.length !== xData.length) {
    throw new Error("Regressions expect (yData, xData) arrays of the same length.");
  }
  const x = [], y = [];
  for (let i = 0; i < yData.length; i++) {
    if (!Number.isFinite(xData[i]) || !Number.isFinite(yData[i]) || (positiveY && yData[i] <= 0)) continue;
    if (xData[i] <= 0) throw new Error("Regression requires x > 0.");
    x.push(xData[i]);
    y.push(yData[i]);
  }
  if (y.length < minN) throw new Error(`Need at least ${minN} valid (x,y) points.`);
  return { x, y };
}

//least squares line v = a + b * u
function lineFit(u, v) {
  const n = u.length;
  let su = 0, sv = 0, suu = 0, suv = 0;
  for (let i = 0; i < n; i++) {
    su += u[i]; sv += v[i]; suu += u[i] * u[i]; suv += u[i] * v[i];
  }
  const denom = n * suu - su * su;
  if (denom === 0) throw new Error("Cannot compute regression (all ln(x) values identical?).");
  const b = (n * suv - su * sv) / denom;
  return { a: (sv - b * su) / n, b };
}

//R^2 of a model's predictions for the points (x,y), computed in y-space
function rSquared(x, y, predict) {
  const mean = y.reduce((s, v) => s + v, 0) / y.length;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < y.length; i++) {
    ssRes += (predict(x[i]) - y[i]) ** 2;
    ssTot += (y[i] - mean) ** 2;
  }
  return ssTot === 0 ? 1 : (1 - ssRes / ssTot);
}

//Performs logarithmic regression: y = a + b * ln(x)
export function logarithmicRegression(yData, xData) {
  const { x, y } = validPairs(yData, xData, 2);
  const { a, b } = lineFit(x.map(Math.log), y);
  regressions[2].A = a;
  regressions[2].B = b;
  return { a, b, r2: rSquared(x, y, v => a + b * Math.log(v)), n: x.length };
}

/**
 * Least squares fit of RT = a * P^(-b) + c  to (x,y) pairs, with b > 0 and c >= 0
 * so the curve falls toward a floor that is not a negative time.
 *
 * Uses variable projection: for a fixed exponent b the model is linear in a and c,
 * so they have a closed form, and only b has to be searched for (a scan, then golden section).
 *
 * @param {number[]} yData – array of response times (>= 0 typically)
 * @param {number[]} xData – array of P values (must be > 0 where used)
 * @returns {{a:number, b:number, c:number, r2:number, n:number}}
 */
export function powerLawFit(yData, xData) {
  const { x, y } = validPairs(yData, xData, 3);
  const n = y.length;

  const lnX = new Float64Array(n);
  let sumY = 0;
  for (let i = 0; i < n; i++) { lnX[i] = Math.log(x[i]); sumY += y[i]; }
  const mean = sumY / n;
  let ssTot = 0;
  for (let i = 0; i < n; i++) ssTot += (y[i] - mean) ** 2;

  // Best a and c for a fixed exponent b, and the sum of squared residuals
  const solveForExponent = (b) => {
    let sz = 0, szz = 0, szy = 0;
    for (let i = 0; i < n; i++) {
      const z = Math.exp(-b * lnX[i]); // x^(-b)
      sz += z; szz += z * z; szy += z * y[i];
    }
    // Ordinary least squares of y on z
    const zMean = sz / n;
    let a = (szy - n * zMean * mean) / (szz - n * zMean * zMean);
    let c = mean - a * zMean;
    // The floor would be negative, so the best allowed fit has c = 0 (least squares through the origin)
    if (!(c >= 0)) { a = szy / szz; c = 0; }

    let ssRes = 0;
    for (let i = 0; i < n; i++) ssRes += (a * Math.exp(-b * lnX[i]) + c - y[i]) ** 2;
    return { a, c, ssRes };
  };

  // Search over t = ln(b) for b in [1e-4, 10]
  const b = Math.exp(scanMax(t => -solveForExponent(Math.exp(t)).ssRes, Math.log(1e-4), Math.log(10), 60, 60));
  const { a, c, ssRes } = solveForExponent(b);
  const r2 = ssTot === 0 ? 1 : (1 - ssRes / ssTot);

  regressions[0].A = a;
  regressions[0].B = b;
  regressions[0].C = c;

  return { a, b, c, r2, n };
}

/**
 * Log–log regression on (x,y) pairs (x>0, y>0).
 * Models: y = A * x^B  => ln(y) = ln(A) + B ln(x)
 *
 * @param {number[]} yData
 * @param {number[]} xData
 * @returns {{A:number, B:number, r2:number, n:number}}
 */
export function logLogRegression(yData, xData) {
  const { x, y } = validPairs(yData, xData, 2, true);
  const { a, b: B } = lineFit(x.map(Math.log), y.map(Math.log));
  const A = Math.exp(a);
  regressions[1].A = A;
  regressions[1].B = B;
  return { A, B, r2: rSquared(x, y, v => A * Math.pow(v, B)), n: x.length };
}
