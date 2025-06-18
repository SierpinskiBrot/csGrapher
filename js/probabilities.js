export {gamma, erf, normalPDF, standardNormalCDF, skewNormalPDF, betaPDF};

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


//normal probability density function
function normalPDF(x, mu, sigma) {
    return (1 / (sigma * Math.sqrt(2 * Math.PI))) * 
        Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
}

//normal cumulative density function
function standardNormalCDF(x) {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

//skew normal probability density function
function skewNormalPDF(x, xi, omega, alpha) {
    const norm = (x - xi) / omega;
    //return (2 / omega) * 
    return (2 / 1) * 
        normalPDF(x, xi, omega) * 
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