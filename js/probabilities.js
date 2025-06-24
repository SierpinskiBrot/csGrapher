export {gamma, erf, normalPDF, standardNormalCDF, skewNormalPDF, gammaPDF, betaPDF, generalNormalCDF, betaCDF};

//gamma function
function gamma(z) {
    //Lanczos Approximation
    const g = 7;
    const p = [
        0.99999999999980993,
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7
    ];

    if (z < 0.5) {
        // Reflection formula
        return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    } else {
        z -= 1;
        let x = p[0];
        for (let i = 1; i < p.length; i++) {
        x += p[i] / (z + i);
        }
        const t = z + g + 0.5;
        return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
    }
}


//error function
function erf(x) {
    // Save the sign of x
    const sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);

    // Constants for approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    // Abramowitz & Stegun formula
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);

    return sign * y;
}

//gamma probability density function
function gammaPDF(x, alpha, theta) {
    return (1 / (gamma(alpha)*(theta ** alpha))) *
        (x ** (alpha - 1)) *
        Math.exp(-x / theta)
}


//normal probability density function
function normalPDF(x, mu, sigma) {
    return (1 / (sigma * Math.sqrt(2 * Math.PI))) * 
        Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
}

function generalNormalCDF(x, mu, sigma) {
    return 0.5 * 
        ( 1 + erf( (x-mu) / (sigma*Math.sqrt(2)) ) );
}

//normal cumulative density function
function standardNormalCDF(x) {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

//skew normal probability density function
function skewNormalPDF(x, xi, omega, alpha) {
    const norm = (x - xi) / omega;
    //return (2 / omega) * 
    return (2 / omega) * 
        normalPDF(norm, 0, 1) * 
        standardNormalCDF(alpha * norm);
}

//beta probability distribution function
function betaPDF(x, alpha, beta) {
    const coeff = gamma(alpha+beta)/(gamma(alpha)*gamma(beta))
    //return (2 / omega) * 
    return coeff *
        (x ** (alpha - 1)) *
        ((1-x) ** (beta - 1));
}


// Approximate the Beta CDF using continued fraction representation
function betaCDF(x, alpha, beta) {
    // Edge cases
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Natural logarithm of the beta function using Gamma function properties
    function logBeta(a, b) {
        return logGamma(a) + logGamma(b) - logGamma(a + b);
    }

    // Continued fraction approximation of the regularized incomplete beta function
    function betacf(x, a, b) {
        const MAX_ITER = 100;
        const EPS = 1e-8;
        let m2, aa, c = 1, d = 1 - (a + b) * x / (a + 1);
        if (Math.abs(d) < EPS) d = EPS;
        d = 1 / d;
        let h = d;

        for (let m = 1; m < MAX_ITER; m++) {
        m2 = 2 * m;
        aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < EPS) d = EPS;
        c = 1 + aa / c;
        if (Math.abs(c) < EPS) c = EPS;
        d = 1 / d;
        h *= d * c;

        aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
        d = 1 + aa * d;
        if (Math.abs(d) < EPS) d = EPS;
        c = 1 + aa / c;
        if (Math.abs(c) < EPS) c = EPS;
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

    // Add logGamma using Lanczos approximation
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
    

    // Return the Beta CDF at x
    return incBeta(x, alpha, beta);
}
