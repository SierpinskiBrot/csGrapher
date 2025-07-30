export { makeArrayOfArrays, binarySearchInsertIdx, round, dhm, sleep, createButton, parseTime, nonlinearExponentialFit};


// Utility to make N arrays
const makeArrayOfArrays = (n) => Array(n).fill().map(() => []);

//quickly find index to insert in sorted array
function binarySearchInsertIdx(arr, val) {
    let low = 0, high = arr.length;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (arr[mid] < val) low = mid + 1;
        else high = mid;
    }
    return low;
}


//round a number to a certain amount of decimal places
function round(num, decimalPlaces = 0) {
    num = Math.round(num + "e" + decimalPlaces);
    return Number(num + "e" + -decimalPlaces);
}


//Get the days, hours, mins, seconds from a time in ms
//> 1 day returns days&hours, else > 1hr returns hours&mins, else > 1min returns mins&secs, else returns secs 
function dhm (ms) {
    const days = Math.floor(ms / (24*60*60*1000));
    const daysms = ms % (24*60*60*1000);
    const hours = Math.floor(daysms / (60*60*1000));
    const hoursms = ms % (60*60*1000);
    const minutes = Math.floor(hoursms / (60*1000));
    const minutesms = ms % (60*1000);
    const sec = Math.floor(minutesms / 1000);
    if(days >= 1) {
        return days + " Days, " + hours + " Hours";
    } else if(hours >= 1) {
        return hours + " Hours, " + minutes + " Mins";
    } else if(minutes >= 1) {
        return minutes + " Mins, " + sec + " Seconds";
    } else {
        return sec + " Seconds";
    }
    return days + " Days, " + hours + " Hours, " + minutes + " Mins";
}


//real sleep
const sleep = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


//Creates a button with the given labeltext, onclick function, and optional class parameter
function createButton(labelText, onClick, className = "") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = labelText;
    if (className) btn.className = className;
    btn.addEventListener("click", onClick);
    return btn;
}


/*
Parsing a solve time from cstimer
    the times are stored in array [t1,t2]
        t2: solve time in milliseconds
        t1: 
             0: normal solve
          2000: +2 (add 2000 milliseconds)
            -1: dnf - delete that for now
*/
function parseTime(t) {
    if(t[0] == 0) {return t[1];}               //normal solve
    else if(t[0] == 2000) {return t[1] + 2000} //+2
    else if(t[0] == -1) {return 0}             //dnf
    //erroneous time
    else {
        console.log("error parsing time:")
        console.log("t1 of " + t[0] + "does not correlate with a +2 or a dnf")
    }
}


/**
 * Quick log linear regression to get an initial guess for [A,B].
 * Assumes x[i], y[i]>0.
 */
function linearInit(x, y) {
    let n = x.length;
    let Sx = 0, Slny = 0, Sxlny = 0, Sx2 = 0;
    for (let i = 0; i < n; i++) {
        Sx += x[i];
        Slny += Math.log(y[i]);
        Sxlny += x[i] * Math.log(y[i]);
        Sx2 += x[i] * x[i];
    }
    let denom = n * Sx2 - Sx * Sx;
    let B = (n * Sxlny - Sx * Slny) / denom;
    let lnA = (Slny - B * Sx) / n;
    return { A: Math.exp(lnA), B };
}

/**
 * Solve 2x2 linear system M*delta = v, where
 *   M = [[m00,m01],[m10,m11]] and v = [v0, v1].
 */
function solve2x2(m00, m01, m10, m11, v0, v1) {
    const det = m00 * m11 - m01 * m10;
    if (Math.abs(det) < 1e-12) throw new Error("Singular matrix");
    return [
        (m11 * v0 - m01 * v1) / det,
        (-m10 * v0 + m00 * v1) / det
    ];
}

/**
 * Levenberg-Marquardt nonlinear least squares for y = A e^(B x).
 *
 * @param {number[]} x       array of independent variables
 * @param {number[]} y       array of dependent variables (y_i > 0)
 * @param {object}   [opts]  optional settings:
 *    maxIter (default=100),
 *    tol     (default=1e-8),
 *    lambda0 (default=1e-3)
 * @returns {{A:number,B:number}}   fitted parameters
 */

function nonlinearExponentialFit(x, y, opts = {}) {
    const n = x.length;
    let { maxIter = 100, tol = 1e-8, lambda0 = 1e-3 } = opts;

    // initial guess from log-linear fit
    let { A, B } = linearInit(x, y);

    let lambda = lambda0;
    let prevSSR = Infinity;

    for (let iter = 0; iter < maxIter; iter++) {
        // build J^T J and J^T r
        let JtJ00 = 0, JtJ01 = 0, JtJ11 = 0;
        let Jtr0 = 0, Jtr1 = 0;
        let SSR = 0;

        for (let i = 0; i < n; i++) {
            const xi = x[i];
            const yi = y[i];
            const Ei = Math.exp(B * xi);
            const fi = A * Ei;           // model prediction
            const ri = yi - fi;          // residual
            SSR += ri * ri;

            // partial derivatives: df/dA = Ei,  df/dB = A xi Ei
            const dA = Ei;
            const dB = A * xi * Ei;

            // accumulate J^T J:
            JtJ00 += dA * dA;
            JtJ01 += dA * dB;
            JtJ11 += dB * dB;

            // accumulate J^T r:
            Jtr0 += dA * ri;
            Jtr1 += dB * ri;
        }

        // check convergence on SSR
        if (Math.abs(prevSSR - SSR) < tol) break;
        prevSSR = SSR;

        // damped normal equations: (J^T J + lambda�diag(J^T J))�delta = J^T r
        const m00 = JtJ00 * (1 + lambda);
        const m01 = JtJ01;
        const m10 = JtJ01;
        const m11 = JtJ11 * (1 + lambda);

        let dA, dB;
        try {
            [dA, dB] = solve2x2(m00, m01, m10, m11, Jtr0, Jtr1);
        } catch (e) {
            break; // singular, give up
        }

        // trial step
        const Anew = A + dA;
        const Bnew = B + dB;

        // compute new SSR
        let SSRnew = 0;
        for (let i = 0; i < n; i++) {
            const fi = Anew * Math.exp(Bnew * x[i]);
            const ri = y[i] - fi;
            SSRnew += ri * ri;
        }

        if (SSRnew < SSR) {
            // improvement: accept and decrease lambda
            A = Anew; B = Bnew;
            lambda *= 0.1;
        } else {
            // no improvement: increase lambda and retry
            lambda *= 10;
        }

        // stop if parameter update is tiny
        if (Math.hypot(dA, dB) < tol * (Math.hypot(A, B) + tol)) {
            break;
        }
    }
    console.log("a",A,"b",B)
    return { A, B };
}

export function rowsToUPlotCols(rows, isDate) {
  if (!rows.length) return [];

  const nSeries = rows[0].length;
  const cols = Array.from({length: nSeries}, () => []);

  for (const r of rows) {
    let x = r[0];

    // 1  X is a Date() ----------------------------------------------
    if (x instanceof Date)          x = x.getTime() / 1000;      // ms → s

    // 2  X is milliseconds (big number > 1e12) ----------------------
    else if (isDate && x > 1e12) x = x / 1000;

    // 3  X is already seconds or a solve-index ----------------------
    cols[0].push(x);

    // copy Y columns unchanged
    for (let i = 1; i < nSeries; i++) cols[i].push(r[i]);
  }
  return cols;
}

export let xAxisIsDate = false;        // default
export function setXAxisMode(isDate) { xAxisIsDate = isDate; }
export let xAxisIsLog = false;
export function setXAxisLog(isLog) { xAxisIsLog = isLog; }
export let yAxisIsLog = false;
export function setYAxisLog(isLog) { yAxisIsLog = isLog; }


