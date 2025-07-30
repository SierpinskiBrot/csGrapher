// regressions.js

export const regressions = [
  {
    id:     "powerLaw",
    label:  "Power-Law Fit",
    color:  "#000000",
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
    color:  "#ff0000",
    width:  2,
    r2: 0,
    A: 0,
    B: 0,
    compute: function(xs) {
      return xs.map(x => this.A * Math.pow(x, this.B));
    }
  },
  {
    id:     "exponential",
    label:  "Exponential Fit",
    color:  "#00aa00",
    width:  2,
    r2: 0,
    A: 0,
    B: 0,
    compute: function(xs) {
      return xs.map(x => this.A * Math.exp(this.B * x));
    }
  },
];



/**
 * Fit RT = a * P^(-b) + c  to an array of y-values (RTs).
 * The array index 0 → P = 1, index 1 → P = 2, ...  (Avoids divide-by-zero.)
 *
 * @param {number[]} y   – array of response times ( ≥ 0 )
 * @param {object}   [opt] – { iterations: 1000, learningRate: 1e-6 }
 * @returns {{a:number, b:number, c:number, r2:number}}
 */
export function powerLawFit(y, opt = {}) {
    const n  = y.length;
    //const offset = parseInt(document.getElementById("regressionOffset").value) || 0; // offset for the x-axis

    if (n < 3) throw new Error('Need at least 3 points');

    // Build the x-axis
    const x = Array.from({ length: n }, (_, i) => i + 1); // 1, 2, 3, ..., n


    // 1. Closed-form starting guess
    //let c = Math.min(...y);                          // shift so RT − c > 0
    //const fastest = Math.min(...y);
    let fastest = 9999999999999999;
    for(let i = 0; i < n; i++) {if(y[i] < fastest) fastest = y[i]}
    let c = fastest
    
    if (!isFinite(c)) c = 0;

    const lnX = x.map(Math.log);
    const lnY = y.map(v => Math.log(Math.max(v - c, 1e-12)));

    const sum = arr => arr.reduce((s, v) => s + v, 0);
    const Sx  = sum(lnX),
        Sy  = sum(lnY),
        Sxx = sum(lnX.map(v => v * v)),
        Sxy = sum(lnX.map((v, i) => v * lnY[i]));

    const slope = (n * Sxy - Sx * Sy) / (n * Sxx - Sx * Sx); // = –b
    const intercept = (Sy - slope * Sx) / n;                 // = ln a

    let a = Math.exp(intercept);
    let b = -slope;

    // 2. Gradient descent
    const iters = opt.iterations   ?? 1000;
    const lr    = opt.learningRate ?? 1e-6;
    const clip    = 1e6;                                 // gradient-norm cap

    for (let k = 0; k < iters; ++k) {
        let gA = 0, gB = 0, gC = 0;

        for (let i = 0; i < n; ++i) {
            const xi = x[i];
            const yi = y[i];
            const xiNegB = Math.pow(xi, -b);
            const yhat   = a * xiNegB + c;
            const diff   = yhat - yi;

            // Gradients of squared error w.r.t. a, b, c
            gA += 2 * diff * xiNegB;
            gB += 2 * diff * a * xiNegB * (-lnX[i]);
            gC += 2 * diff;

        }

        // normalise gradients so no single step is too large
        const gNorm = Math.hypot(gA, gB, gC);
        if (gNorm > clip) {
            gA *= clip / gNorm;
            gB *= clip / gNorm;
            gC *= clip / gNorm;
        }

        const lrDecayed = lr / Math.sqrt(k + 1); // decay learning rate
        //const lrDecayed = lr / Math.pow(k+1,0.3); // decay learning rate
        
        //a -= lr * gA;
        //b -= lr * gB;
        //c -= lr * gC;
        a -= lrDecayed * gA;
        b -= lrDecayed * gB;
        c -= lrDecayed * gC;
        if(c > fastest) c = fastest; // don't let c go above the fastest time

        // Tiny parameter updates => converged
        //if (Math.max(Math.abs(lr * gA), Math.abs(lr * gB), Math.abs(lr * gC)) < 1e-12) break;
        if (Math.max(Math.abs(lrDecayed * gA), Math.abs(lrDecayed * gB), Math.abs(lrDecayed * gC)) < 1e-12) break;
    }

    // Coefficient of determination
    const mean = y.reduce((s, v) => s + v, 0) / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; ++i) {
        const diff = (a * Math.exp(-b * lnX[i]) + c) - y[i];
        ssRes += diff * diff;
        ssTot += (y[i] - mean) ** 2;
    }
    const r2 = 1 - ssRes / ssTot;

    regressions[0].r2 = r2;
    regressions[0].A = a;
    regressions[0].B = b;   
    regressions[0].C = c;    

    powerLawR2.innerText = r2.toFixed(3);
}

/**
 * Performs a log–log regression on an array of positive values.
 * Treats x = index+1 (so x starts at 1).
 * Models y ≈ A * x^B.
 *
 * @param {number[]} data  Array of y values (must be > 0).
 * @returns {{ A: number, B: number }}  Regression constants so y ≈ A * x^B
 */
export function logLogRegression(data) {
    // Prepare arrays of ln(x) and ln(y), skipping any non-positive y
    //const offset = parseInt(document.getElementById("regressionOffset").value) || 0; // offset for the x-axis
    const logX = [];
    const logY = [];
    
    for (let i = 0; i < data.length; i++) {
        const y = data[i];
        const x = i + 1;            // avoid log(0)
        if (y > 0) {
        logX.push(Math.log(x));
        logY.push(Math.log(y));
        }
    }
    
    const n = logX.length;
    if (n === 0) {
        throw new Error("No positive data points to regress.");
    }
    
    // Compute sums needed for the linear regression
    const sumX  = logX.reduce((a, b) => a + b, 0);
    const sumY  = logY.reduce((a, b) => a + b, 0);
    const sumXY = logX.reduce((a, xi, i) => a + xi * logY[i], 0);
    const sumXX = logX.reduce((a, xi) => a + xi * xi, 0);
    
    // slope B = (n*Σ(xy) - Σx*Σy) / (n*Σ(x^2) - (Σx)^2)
    const B = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // intercept C = (Σy - B*Σx) / n  where C = ln(A)
    const C = (sumY - B * sumX) / n;
    
    // Convert back: A = e^C
    const A = Math.exp(C);
    
    //regressions[1].r2 = r2;
    regressions[1].A = A;
    regressions[1].B = B;   

    //return { A, B };
    // Coefficient of determination
    const mean = data.reduce((s, v) => s + v, 0) / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; ++i) {
        const diff = A * Math.pow(i+1, B) - data[i];
        ssRes += diff * diff;
        ssTot += (data[i] - mean) ** 2;
    }
    const r2 = 1 - ssRes / ssTot;
    loglogR2.innerText = r2.toFixed(3);
}

/*
Performs exponential regression (y = a * e^(b x)) on an array of Y-values.
X-values are taken as the indices (0, 1, 2, ...).
*/
export function exponentialRegression(data) {
    // Filter out non-positive Y (ln undefined) and map to {x,y}
    const points = data
        .map((y, x) => ({ x, y }))
        .filter(pt => pt.y > 0);

    const n = points.length;
    if (n === 0) {
        throw new Error("At least one positive y-value is required.");
    }

    // Compute sums for the normal equations
    let sumX = 0, sumLnY = 0, sumXlnY = 0, sumX2 = 0;
    for (const { x, y } of points) {
        const lnY = Math.log(y);
        sumX += (x+1);
        sumLnY += lnY;
        sumXlnY += (x + 1) * lnY;
        sumX2 += (x + 1) * (x + 1);
    }

    // Solve for b 
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) {
        throw new Error("Cannot compute regression (all x-values identical?).");
    }
    const b = (n * sumXlnY - sumX * sumLnY) / denom;

    // Then ln(a) 
    const lnA = (sumLnY - b * sumX) / n;
    const a = Math.exp(lnA);


    //regressions[2].r2 = r2;
    regressions[2].A = a;
    regressions[2].B = b;  
    //return { a, b };

    // Coefficient of determination
    const mean = data.reduce((s, v) => s + v, 0) / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; ++i) {
        const diff = a * Math.exp(b * (i+1)) - data[i];
        ssRes += diff * diff;
        ssTot += (data[i] - mean) ** 2;
    }
    const r2 = 1 - ssRes / ssTot;
    exponentialR2.innerText = r2.toFixed(3);
}