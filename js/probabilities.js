export {erfc, normalPDF, logitNormPDF, logPDF, logCDF, logitNormCDF, standardNormalCDF, skewNormalPDF, skewNormalCDF, owensT, gammaPDF, gammaCDF, generalNormalCDF, betaCDF, exGaussPDF, exGaussCDF, tCrit68, olsThroughPoint, sampleMoments, scanMax, fitNormal, fitSkewNormal, fitGamma, fitExGauss, fitShiftedLog, fitLogitNormal, fitMetalog, metalogQuantile, makeMetalogCDF, makeMetalogPDF};

function logGamma(z) {
    const g = 7;
    const C = [
        0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059,
        12.507343278686905, -0.13857109526572012,
        9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    if (z < 0.5) {
        return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    } else {
        z -= 1;
        let x = C[0];
        for (let i = 1; i < g + 2; i++) x += C[i] / (z + i);
        const t = z + g + 0.5;
        return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
    }
}

//error function, by its Taylor series (accurate to ~1e-15 for |x| < 3)
function erfSeries(x) {
    const x2 = x * x;
    let term = x, sum = x;
    for (let n = 1; n < 200; n++) {
        term *= -x2 / n;
        const add = term / (2 * n + 1);
        sum += add;
        if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
    }
    return sum * 2 / Math.sqrt(Math.PI);
}

//scaled complementary error function exp(x^2) * erfc(x) for x >= 2, by its continued fraction
function erfcxCF(x) {
    let f = x;
    for (let k = 60; k >= 1; k--) f = x + (k / 2) / f;
    return 1 / (f * Math.sqrt(Math.PI));
}

//complementary error function 1 - erf(x), with full relative precision in the tail
function erfc(x) {
    if (x < 0) return 2 - erfc(-x);
    if (x < 2) return 1 - erfSeries(x);
    return Math.exp(-x * x) * erfcxCF(x);
}

//scaled complementary error function exp(x^2) * erfc(x) for x >= 0
function erfcx(x) {
    if (x >= 2) return erfcxCF(x);
    return Math.exp(x * x) * erfc(x);
}

//gamma probability density function
function gammaPDF(x, alpha, theta) {
    if (x < 0) return 0;
    return Math.exp(-logGamma(alpha) - alpha * Math.log(theta) + (alpha - 1) * Math.log(x) - x / theta);
}

//normal probability density function
function normalPDF(x, mu, sigma) {
    return (1 / (sigma * Math.sqrt(2 * Math.PI))) * 
        Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
}

function generalNormalCDF(x, mu, sigma) {
    return standardNormalCDF((x - mu) / sigma);
}

//normal cumulative density function
//written with erfc so that small values in the lower tail keep their precision
function standardNormalCDF(x) {
    return 0.5 * erfc(-x / Math.SQRT2);
}

//Gauss-Legendre nodes and weights on [-1, 1], used for Owen's T function
const GAUSS_LEGENDRE = (() => {
    const N = 20, nodes = [], weights = [];
    for (let i = 1; i <= N; i++) {
        let z = Math.cos(Math.PI * (i - 0.25) / (N + 0.5)), pp = 1;
        for (let iter = 0; iter < 100; iter++) {
            let p1 = 1, p2 = 0;
            for (let j = 1; j <= N; j++) {
                const p3 = p2;
                p2 = p1;
                p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j;
            }
            pp = N * (z * p1 - p2) / (z * z - 1);
            const z1 = z;
            z = z1 - p1 / pp;
            if (Math.abs(z - z1) < 1e-15) break;
        }
        nodes.push(z);
        weights.push(2 / ((1 - z * z) * pp * pp));
    }
    return { nodes, weights };
})();

//Owen's T function T(h, a) = 1/(2pi) * integral from 0 to a of exp(-h^2 (1 + x^2) / 2) / (1 + x^2) dx
function owensT(h, a) {
    if (a < 0) return -owensT(h, -a);
    if (a === 0) return 0;
    h = Math.abs(h);

    if (a > 1) {
        //T(h, a) = [Phi(h) Q(ah) + Phi(ah) Q(h)] / 2 - T(ah, 1/a), which keeps the integration range within [0, 1]
        const ah = a * h;
        const Ph = standardNormalCDF(h), Qh = standardNormalCDF(-h);
        const Pah = standardNormalCDF(ah), Qah = standardNormalCDF(-ah);
        return 0.5 * (Ph * Qah + Pah * Qh) - owensT(ah, 1 / a);
    }

    //the integrand falls off like exp(-h^2 x^2 / 2), so it is negligible past x = sqrt(80) / h
    const upper = h > 0 ? Math.min(a, Math.sqrt(80) / h) : a;
    const panels = Math.max(1, Math.ceil(upper * h / 1.5));
    const width = upper / panels;
    const halfH2 = h * h / 2;
    const { nodes, weights } = GAUSS_LEGENDRE;
    let sum = 0;
    for (let p = 0; p < panels; p++) {
        const mid = (p + 0.5) * width;
        for (let i = 0; i < nodes.length; i++) {
            const x = mid + 0.5 * width * nodes[i];
            const onePlusX2 = 1 + x * x;
            sum += weights[i] * Math.exp(-halfH2 * onePlusX2) / onePlusX2;
        }
    }
    return sum * 0.5 * width / (2 * Math.PI);
}

//skew normal cumulative density function, F(x) = Phi(z) - 2 T(z, alpha)
function skewNormalCDF(x, xi, omega, alpha) {
    const z = (x - xi) / omega;
    const F = standardNormalCDF(z) - 2 * owensT(z, alpha);
    return Math.min(Math.max(F, 0), 1);
}

//regularized lower incomplete gamma function P(a, x)
function regLowerGamma(a, x) {
    if (x <= 0) return 0;
    const logPrefix = a * Math.log(x) - x - logGamma(a);

    if (x < a + 1) {
        //series
        let ap = a, del = 1 / a, sum = del;
        for (let n = 0; n < 10000; n++) {
            ap++;
            del *= x / ap;
            sum += del;
            if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
        }
        return Math.min(1, sum * Math.exp(logPrefix));
    }

    //continued fraction for Q(a, x) = 1 - P(a, x), modified Lentz's method
    const FPMIN = 1e-300;
    let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (let i = 1; i < 10000; i++) {
        const an = -i * (i - a);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = b + an / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;
        const del = d * c;
        h *= del;
        if (Math.abs(del - 1) < 1e-16) break;
    }
    return Math.max(0, 1 - Math.exp(logPrefix) * h);
}

//gamma cumulative density function
function gammaCDF(x, alpha, theta) {
    return regLowerGamma(alpha, x / theta);
}

//skew normal probability density function
function skewNormalPDF(x, xi, omega, alpha) {
    const norm = (x - xi) / omega;
    return (2 / omega) *
        normalPDF(norm, 0, 1) * 
        standardNormalCDF(alpha * norm);
}

//log(Phi(z) / phi(z)), the log of the inverse Mills ratio, without overflow in either tail
function logMillsRatio(z) {
    if (z <= 0) return 0.5 * Math.log(Math.PI / 2) + Math.log(erfcx(-z / Math.SQRT2));
    return Math.log(standardNormalCDF(z)) + 0.5 * z * z + 0.5 * Math.log(2 * Math.PI);
}

//log of the ex-Gaussian density times tau: log(phi(u)) + log(Phi(z) / phi(z))
//the usual form exp((mu - x)/tau + sigma^2/(2 tau^2)) * Phi(z) overflows when sigma/tau is large, this does not
function exGaussLogKernel(u, z) {
    return -0.5 * u * u - 0.5 * Math.log(2 * Math.PI) + logMillsRatio(z);
}

//ex-Gaussian (exponentially modified Gaussian) probability density function
//a normal(mu, sigma) plus an exponential with mean tau
function exGaussPDF(x, mu, sigma, tau) {
    const u = (x - mu) / sigma, z = u - sigma / tau;
    return Math.exp(exGaussLogKernel(u, z)) / tau;
}

//ex-Gaussian cumulative density function, F(x) = Phi(u) - phi(u) * Phi(z) / phi(z)
function exGaussCDF(x, mu, sigma, tau) {
    const u = (x - mu) / sigma, z = u - sigma / tau;
    const F = standardNormalCDF(u) - Math.exp(exGaussLogKernel(u, z));
    return Math.min(Math.max(F, 0), 1);
}

// Approximate the Beta CDF using continued fraction representation
function betaCDF(x, alpha, beta) {
    // Edge cases
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Continued fraction approximation of the regularized incomplete beta function
    function betacf(x, a, b) {
        const MAX_ITER = 10000;
        const EPS = 1e-15;
        const FPMIN = 1e-300;
        let m2, aa, c = 1, d = 1 - (a + b) * x / (a + 1);
        if (Math.abs(d) < FPMIN) d = FPMIN;
        d = 1 / d;
        let h = d;

        for (let m = 1; m < MAX_ITER; m++) {
            m2 = 2 * m;
            aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
            d = 1 + aa * d;
            if (Math.abs(d) < FPMIN) d = FPMIN;
            c = 1 + aa / c;
            if (Math.abs(c) < FPMIN) c = FPMIN;
            d = 1 / d;
            h *= d * c;

            aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
            d = 1 + aa * d;
            if (Math.abs(d) < FPMIN) d = FPMIN;
            c = 1 + aa / c;
            if (Math.abs(c) < FPMIN) c = FPMIN;
            d = 1 / d;
            let del = d * c;
            h *= del;
            if (Math.abs(del - 1.0) < EPS) break;
        }
        return h;
    }

    // Regularized incomplete beta function I_x(alpha, beta)
    function incBeta(x, a, b) {
        const bt = Math.exp(
        a * Math.log(x) + b * Math.log(1 - x) - logBeta(a, b)
        );
        if (x < (a + 1) / (a + b + 2)) {
            return bt * betacf(x, a, b) / a;
        } else {
            return 1 - bt * betacf(1 - x, b, a) / b;
        }
    }
        
    // Return the Beta CDF at x
    return incBeta(x, alpha, beta);
}

function logit(x) {
    return Math.log(x / (1-x))
}

function logitNormPDF(x, mu, sigma) {
    if(x == 0) return 0
    return normalPDF(logit(x), mu, sigma) / (x * (1 - x))
}

function logitNormCDF(x, mu, sigma) {
    if (x <= 0) return 0
    if (x >= 1) return 1
    return standardNormalCDF((logit(x) - mu) / sigma)
}

function logPDF(x, mu, sigma) {
    if(x <= 0) return 0
    return normalPDF(Math.log(x), mu, sigma) / x
}

function logCDF(x, mu, sigma) {
    if (x <= 0) return 0
    return standardNormalCDF((Math.log(x) - mu) / sigma)
}

function digamma(x) {
    let result = 0;
    while (x < 7) { result -= 1 / x; x++; }
    const x2 = 1 / (x * x);
    result += Math.log(x) - 0.5 / x - x2 * (1 / 12 - x2 * (1 / 120 - x2 / 252));
    return result;
}

function trigamma(x) {
    let result = 0;
    while (x < 7) { result += 1 / (x * x); x++; }
    const x2 = 1 / (x * x);
    return result + 0.5 * x2 + (1 + x2 * (1 / 6 - x2 * (1 / 30 - x2 / 42))) / x;
}

//two-sided critical value of Student's t with dof degrees of freedom
//covering 68.27% (the same coverage as +-1 SD of a normal distribution)
function tCrit68(dof) {
    const tail = 1 - 0.6826894921;
    let lo = 0, hi = 1000;
    for (let i = 0; i < 100; i++) {
        const t = (lo + hi) / 2;
        //P(|T| > t) = I_{dof/(dof+t^2)}(dof/2, 1/2)
        const p = betaCDF(dof / (dof + t * t), dof / 2, 0.5);
        if (p > tail) lo = t; else hi = t;
    }
    return (lo + hi) / 2;
}

//least squares line forced through the point (ax, ay): y = ay + b*(x - ax)
//plus a 68% prediction interval for a new point at x0
//returns null if there are not enough points to estimate the scatter
function olsThroughPoint(xs, ys, ax, ay, x0) {
    const m = xs.length;
    if (m < 2) return null;

    let Sxx = 0, Sxy = 0;
    for (let i = 0; i < m; i++) {
        Sxx += (xs[i] - ax) ** 2;
        Sxy += (xs[i] - ax) * (ys[i] - ay);
    }
    if (Sxx === 0) return null;

    const b = Sxy / Sxx;

    let sse = 0;
    for (let i = 0; i < m; i++) sse += (ys[i] - ay - b * (xs[i] - ax)) ** 2;
    const dof = m - 1; //only the slope is fitted
    const s = Math.sqrt(sse / dof);

    //standard error of a NEW observation at x0 (slope uncertainty + scatter)
    const d0 = x0 - ax;
    const se = s * Math.sqrt(1 + d0 * d0 / Sxx);
    const yhat = ay + b * d0;
    const half = tCrit68(dof) * se;

    return { b, yhat, lo: yhat - half, hi: yhat + half };
}

//natural log of the beta function
function logBeta(a, b) {
    return logGamma(a) + logGamma(b) - logGamma(a + b);
}

//maximize a function of one variable on [lo, hi] by golden section search
function goldenSectionMax(f, lo, hi, iters = 40) {
    const r = (Math.sqrt(5) - 1) / 2;
    let a = lo, b = hi;
    let c = b - r * (b - a), d = a + r * (b - a);
    let fc = f(c), fd = f(d);
    for (let i = 0; i < iters; i++) {
        if (fc > fd) { b = d; d = c; fd = fc; c = b - r * (b - a); fc = f(c); }
        else { a = c; c = d; fc = fd; d = a + r * (b - a); fd = f(d); }
    }
    //the maximum can sit on a boundary of the search range
    const x = (a + b) / 2;
    const candidates = [[x, f(x)], [lo, f(lo)], [hi, f(hi)]];
    return candidates.reduce((best, cur) => cur[1] > best[1] ? cur : best)[0];
}

//maximize f on [lo, hi]: evaluate it at steps + 1 evenly spaced points to find the right peak,
//then narrow down between the best point's neighbours with golden section search
function scanMax(f, lo, hi, steps, iters = 40) {
    const at = i => lo + (hi - lo) * i / steps;
    let bestI = 0, best = -Infinity;
    for (let i = 0; i <= steps; i++) {
        const v = f(at(i));
        if (v > best) { best = v; bestI = i; }
    }
    return goldenSectionMax(f, at(Math.max(0, bestI - 1)), at(Math.min(steps, bestI + 1)), iters);
}

//group repeated values, since solve times are recorded to the hundredth and repeat a lot
function countValues(xs) {
    const counts = new Map();
    for (const x of xs) counts.set(x, (counts.get(x) || 0) + 1);
    const values = new Float64Array(counts.size), weights = new Float64Array(counts.size);
    let i = 0, top = 0;
    for (const [x, c] of counts) { values[i] = x; weights[i++] = c; if (x > top) top = x; }
    return { values, weights, n: xs.length, top };
}

//minimize f over a vector with the Nelder-Mead simplex method
function nelderMead(f, start, steps, maxIter = 1000, tol = 1e-12) {
    const n = start.length;
    let simplex = [start.slice()];
    for (let i = 0; i < n; i++) {
        const v = start.slice();
        v[i] += steps[i];
        simplex.push(v);
    }
    let vals = simplex.map(f);
    const along = (from, to, t) => from.map((v, i) => v + t * (to[i] - v));

    for (let iter = 0; iter < maxIter; iter++) {
        const order = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]);
        simplex = order.map(i => simplex[i]);
        vals = order.map(i => vals[i]);
        if (Math.abs(vals[n] - vals[0]) <= tol * (Math.abs(vals[0]) + tol)) break;

        const centroid = Array(n).fill(0);
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;

        const worst = simplex[n];
        const reflected = along(worst, centroid, 2);
        const fr = f(reflected);
        if (fr < vals[0]) {
            const expanded = along(worst, centroid, 3);
            const fe = f(expanded);
            if (fe < fr) { simplex[n] = expanded; vals[n] = fe; }
            else { simplex[n] = reflected; vals[n] = fr; }
        } else if (fr < vals[n - 1]) {
            simplex[n] = reflected; vals[n] = fr;
        } else {
            //contract toward the centroid, from outside or inside
            const contracted = fr < vals[n] ? along(centroid, reflected, 0.5) : along(centroid, worst, 0.5);
            const fc = f(contracted);
            if (fc < Math.min(fr, vals[n])) { simplex[n] = contracted; vals[n] = fc; }
            else {
                //shrink toward the best point
                for (let i = 1; i <= n; i++) {
                    simplex[i] = along(simplex[0], simplex[i], 0.5);
                    vals[i] = f(simplex[i]);
                }
            }
        }
    }
    let best = 0;
    for (let i = 1; i <= n; i++) if (vals[i] < vals[best]) best = i;
    return simplex[best];
}

//mean, standard deviation and skewness of a sample
function sampleMoments(xs) {
    const n = xs.length;
    let mean = 0;
    for (const x of xs) mean += x;
    mean /= n;
    let m2 = 0, m3 = 0;
    for (const x of xs) { const d = x - mean; m2 += d * d; m3 += d * d * d; }
    const sd = Math.sqrt(m2 / n);
    return { mean, sd, skew: (m3 / n) / sd ** 3 };
}

//maximum likelihood fit of a normal distribution
function fitNormal(xs) {
    const { mean, sd } = sampleMoments(xs);
    return { mu: mean, sigma: sd };
}

//method of moments fit of a skew normal distribution, on the data with the slowest and fastest 1% trimmed off
//(maximum likelihood was tried, but slow outliers pull the light-tailed skew normal off the bulk of the data)
function fitSkewNormal(xs) {
    const sorted = Float64Array.from(xs).sort();
    const trimmed = sorted.slice(Math.floor(0.01 * xs.length), Math.ceil(xs.length * 0.99));
    const n = trimmed.length;
    const mean = trimmed.reduce((s, v) => s + v, 0) / n;
    const m2 = trimmed.reduce((s, v) => s + (v - mean) ** 2, 0);
    const m3 = trimmed.reduce((s, v) => s + (v - mean) ** 3, 0);
    const sd = Math.sqrt(m2 / (n - 1));
    const g1 = (n * m3) / ((n - 1) * (n - 2) * sd ** 3); //unbiased Fisher-Pearson skewness

    //invert skewness = (4 - pi)/2 * d^3 / (1 - d^2)^(3/2), where d = delta * sqrt(2/pi)
    //delta is kept within +-0.995, since a skew normal cannot be more skewed than that
    const r = Math.cbrt(2 * Math.abs(g1) / (4 - Math.PI));
    const delta = Math.sign(g1) * Math.min(r / Math.sqrt(1 + r * r) / Math.sqrt(2 / Math.PI), 0.995);
    const omega = sd / Math.sqrt(1 - 2 / Math.PI * delta * delta);
    return { xi: mean - omega * delta * Math.sqrt(2 / Math.PI), omega, alpha: delta / Math.sqrt(1 - delta * delta) };
}

//maximum likelihood fit of a gamma distribution: Minka's approximation of the shape, refined by Newton's method
function fitGamma(xs) {
    const { mean } = sampleMoments(xs);
    const s = Math.log(mean) - xs.reduce((sum, t) => sum + Math.log(t), 0) / xs.length;
    let alpha = (3 - s + Math.sqrt((s - 3) ** 2 + 24 * s)) / (12 * s);
    for (let i = 0; i < 5000; i++) {
        const step = (Math.log(alpha) - digamma(alpha) - s) / (1 / alpha - trigamma(alpha));
        alpha -= step;
        if (Math.abs(step) < 1e-12) break;
        if (alpha <= 0) alpha = 1e-3;
    }
    return { alpha, theta: mean / alpha };
}

//maximum likelihood fit of an ex-Gaussian distribution
//starts from the method of moments estimate (skewness = 2 tau^3 / sd^3) and refines it with Nelder-Mead
function fitExGauss(xs) {
    const { values, weights, n } = countValues(xs);
    const { mean, sd, skew } = sampleMoments(xs);

    //keep the start inside the valid region (0 < tau < sd)
    const tau0 = sd * Math.cbrt(Math.min(Math.max(skew / 2, 0.01), 0.9));
    const sigma0 = Math.sqrt(sd * sd - tau0 * tau0);
    const mu0 = mean - tau0;

    //negative log likelihood, with sigma and tau on a log scale so they stay positive
    const nll = ([mu, logSigma, logTau]) => {
        const sigma = Math.exp(logSigma), tau = Math.exp(logTau);
        let sum = n * logTau;
        for (let i = 0; i < values.length; i++) {
            const u = (values[i] - mu) / sigma;
            sum -= weights[i] * exGaussLogKernel(u, u - sigma / tau);
        }
        return sum;
    };
    const [mu, logSigma, logTau] = nelderMead(nll, [mu0, Math.log(sigma0), Math.log(tau0)], [0.1 * sd, 0.2, 0.2]);
    return { mu, sigma: Math.exp(logSigma), tau: Math.exp(logTau) };
}

//maximum likelihood fit of a shifted (three parameter) log-normal distribution, log(x - gamma) ~ normal(mu, sigma)
//for a fixed shift gamma, mu and sigma are the mean and sd of log(x - gamma), so only gamma has to be searched for
function fitShiftedLog(xs) {
    const { values, weights, n } = countValues(xs);
    const { sd } = sampleMoments(xs);
    let min = Infinity;
    for (const x of xs) if (x < min) min = x;

    const fitForShift = (gamma) => {
        let sum = 0, sumSq = 0;
        for (let i = 0; i < values.length; i++) {
            const l = Math.log(values[i] - gamma);
            sum += weights[i] * l;
            sumSq += weights[i] * l * l;
        }
        const mu = sum / n;
        const sigma = Math.sqrt(Math.max(sumSq / n - mu * mu, 1e-300));
        return { mu, sigma, ll: -n * Math.log(sigma) - n / 2 - sum };
    };

    //search over t = log(min - gamma)
    //the likelihood is unbounded as gamma reaches the fastest solve, but only absurdly close to it (far below 1e-6 sd),
    //so a coarse scan followed by golden section finds the interior maximum
    const shift = (t) => min - Math.exp(t);
    const gamma = shift(scanMax(t => fitForShift(shift(t)).ll, Math.log(1e-6 * sd), Math.log(min + 20 * sd), 40));
    const { mu, sigma } = fitForShift(gamma);
    return { gamma, mu, sigma };
}

//maximum likelihood fit of a logit-normal distribution on [0, max]
//for a fixed upper bound mu and sigma are the mean and sd of logit(x / max); the bound comes from the profile likelihood
function fitLogitNormal(xs) {
    const { values, weights, n, top } = countValues(xs);

    const fitForUpper = (upper) => {
        let sum = 0, sumSq = 0, jacobian = 0;
        for (let i = 0; i < values.length; i++) {
            const u = values[i] / upper, w = weights[i];
            const logU = Math.log(u), log1mU = Math.log1p(-u);
            const z = logU - log1mU;
            sum += w * z;
            sumSq += w * z * z;
            jacobian += w * (logU + log1mU);
        }
        const mu = sum / n;
        const sigma = Math.sqrt(Math.max(sumSq / n - mu * mu, 1e-300));
        const ll = -n * Math.log(sigma) - n / 2 - jacobian - n * Math.log(upper);
        return { mu, sigma, ll };
    };

    const toUpper = (t) => top * (1 + Math.exp(t));
    const best = goldenSectionMax(t => fitForUpper(toUpper(t)).ll, Math.log(1e-6), Math.log(100));
    const upper = toUpper(best);
    const { mu, sigma } = fitForUpper(upper);
    return { mu, sigma, max: upper };
}

//-------------------- METALOG DISTRIBUTION --------------------
//a quantile-parameterized distribution (Keelin 2016), unbounded form
//the quantile function is a sum of k basis functions of the probability y:
//  Q(y) = a1 + a2 L + a3 (y-1/2) L + a4 (y-1/2) + a5 (y-1/2)^2 + a6 (y-1/2)^2 L + a7 (y-1/2)^3 + ...   where L = ln(y / (1-y))
//more terms follow the data more closely

//write the k basis function values at probability y into out
function metalogBasis(y, k, out) {
    const L = Math.log(y / (1 - y)), c = y - 0.5;
    out[0] = 1;
    if (k > 1) out[1] = L;
    if (k > 2) out[2] = c * L;
    if (k > 3) out[3] = c;
    let cp = c;
    for (let j = 5; j <= k; j++) {
        if (j % 2 === 1) { cp *= c; out[j - 1] = cp; } //odd terms: (y-1/2)^((j-1)/2)
        else out[j - 1] = cp * L;                        //even terms: (y-1/2)^(j/2-1) L
    }
    return out;
}

//quantile function Q(y)
function metalogQuantile(a, y) {
    const k = a.length, L = Math.log(y / (1 - y)), c = y - 0.5;
    let q = a[0];
    if (k > 1) q += a[1] * L;
    if (k > 2) q += a[2] * c * L;
    if (k > 3) q += a[3] * c;
    let cp = c;
    for (let j = 5; j <= k; j++) {
        if (j % 2 === 1) { cp *= c; q += a[j - 1] * cp; }
        else q += a[j - 1] * cp * L;
    }
    return q;
}

//derivative dQ/dy, which is 1 / density at Q(y)
function metalogQuantileDensity(a, y) {
    const k = a.length, L = Math.log(y / (1 - y)), c = y - 0.5, dL = 1 / (y * (1 - y));
    let d = 0;
    if (k > 1) d += a[1] * dL;
    if (k > 2) d += a[2] * (L + c * dL);
    if (k > 3) d += a[3];
    let cpm1 = 1, cp = c; //(y-1/2)^(p-1) and (y-1/2)^p
    for (let j = 5; j <= k; j++) {
        if (j % 2 === 1) {
            const p = (j - 1) / 2;
            cpm1 = cp; cp *= c;
            d += a[j - 1] * p * cpm1;
        } else {
            const p = j / 2 - 1;
            d += a[j - 1] * (p * cpm1 * L + cp * dL);
        }
    }
    return d;
}

//probabilities are searched over t = logit(y) in [-METALOG_T, METALOG_T], which covers y down to about 2e-16
const METALOG_T = 36;
const METALOG_GRID = 8000;
const sigmoid = t => 1 / (1 + Math.exp(-t));

//least squares solution of X a = rhs by Householder QR, with X given as an array of columns
function leastSquares(cols, rhs) {
    const k = cols.length, n = rhs.length;
    const A = cols.map(c => Float64Array.from(c)), b = Float64Array.from(rhs);
    const v = new Float64Array(n);
    for (let j = 0; j < k; j++) {
        let norm = 0;
        for (let i = j; i < n; i++) norm += A[j][i] * A[j][i];
        norm = Math.sqrt(norm);
        const alpha = A[j][j] > 0 ? -norm : norm;
        let vv = 0;
        for (let i = j; i < n; i++) { v[i] = A[j][i]; }
        v[j] -= alpha;
        for (let i = j; i < n; i++) vv += v[i] * v[i];
        if (vv === 0) continue;
        const reflect = (col) => {
            let dot = 0;
            for (let i = j; i < n; i++) dot += v[i] * col[i];
            const f = 2 * dot / vv;
            for (let i = j; i < n; i++) col[i] -= f * v[i];
        };
        for (let m = j; m < k; m++) reflect(A[m]);
        reflect(b);
    }
    const x = new Array(k).fill(0);
    for (let j = k - 1; j >= 0; j--) {
        let s = b[j];
        for (let m = j + 1; m < k; m++) s -= A[m][j] * x[m];
        x[j] = s / A[j][j];
    }
    return x;
}

//fit a k term metalog by least squares on the empirical quantiles: the i-th fastest of n solves sits at y = (i - 1/2) / n
//feasible is false when the fitted quantile function is not increasing everywhere, so it is not a valid distribution
function fitMetalog(xs, k) {
    const sorted = Float64Array.from(xs).sort();
    const n = sorted.length;
    k = Math.max(2, Math.min(k, n));
    const cols = Array.from({ length: k }, () => new Float64Array(n));
    const b = new Float64Array(k);
    for (let i = 0; i < n; i++) {
        metalogBasis((i + 0.5) / n, k, b);
        for (let j = 0; j < k; j++) cols[j][i] = b[j];
    }
    const a = leastSquares(cols, sorted);

    let feasible = a.every(Number.isFinite);
    for (let i = 0; i <= METALOG_GRID && feasible; i++) {
        const y = sigmoid(-METALOG_T + 2 * METALOG_T * i / METALOG_GRID);
        if (!(metalogQuantileDensity(a, y) > 0)) feasible = false;
    }
    return { a, feasible };
}

//build the cdf of a feasible metalog, found by inverting the quantile function
//a table of Q over a grid of t = logit(y) brackets each x, then bisection narrows it down
function makeMetalogCDF(a) {
    const ts = new Float64Array(METALOG_GRID + 1), qs = new Float64Array(METALOG_GRID + 1);
    for (let i = 0; i <= METALOG_GRID; i++) {
        ts[i] = -METALOG_T + 2 * METALOG_T * i / METALOG_GRID;
        qs[i] = metalogQuantile(a, sigmoid(ts[i]));
    }
    return (x) => {
        if (x <= qs[0]) return 0;
        if (x >= qs[METALOG_GRID]) return 1;
        let lo = 0, hi = METALOG_GRID;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (qs[mid] <= x) lo = mid; else hi = mid;
        }
        let tLo = ts[lo], tHi = ts[hi];
        for (let i = 0; i < 30; i++) {
            const tMid = (tLo + tHi) / 2;
            if (metalogQuantile(a, sigmoid(tMid)) <= x) tLo = tMid; else tHi = tMid;
        }
        return sigmoid((tLo + tHi) / 2);
    };
}

//build the pdf of a feasible metalog, f(x) = 1 / Q'(F(x))
function makeMetalogPDF(a) {
    const cdf = makeMetalogCDF(a);
    return (x) => {
        const y = cdf(x);
        if (y <= 0 || y >= 1) return 0;
        return 1 / metalogQuantileDensity(a, y);
    };
}
