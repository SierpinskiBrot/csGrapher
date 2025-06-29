import {round, sleep} from "./utils.js"
import {normalPDF, skewNormalPDF, betaPDF, logit, logitNormPDF, logPDF, logCDF, logitNormCDF, gammaPDF, generalNormalCDF, betaCDF} from "./probabilities.js"
import {themes} from "./themes.js"

export {histogramTabStartup}


window.sldWinPlaying = false;
window.creationPlaying = false;
window.distribMode = "pdf"

//sliding window play
document.getElementById("sldWinPlay").addEventListener("click", function() {
    if(window.sldWinPlaying) {window.sldWinPlaying = false;} 
    else {window.creationPlaying = false; animateHistRange();} })
//sliding window reset
document.getElementById("sldWinReset").addEventListener("click", function() {
    histBucketInput.value = 1
    window.userData.createHist(histBucketInput.value)
    updateHist(); })
//sliding window defaults
document.getElementById("sldWinDefaults").addEventListener("click", function() {window.userData.genSlidingWindowDefaults();})

//creation play
document.getElementById("creationPlay").addEventListener("click", function() {
    if(window.creationPlaying) {window.creationPlaying = false} 
    else {window.sldWinPlaying = false;animateHistCreate();} })
//creation reset
document.getElementById("creationReset").addEventListener("click", function() {
    histBucketInput.value = 1
    window.userData.createHist(histBucketInput.value)
    updateHist(); })
//creation defaults
document.getElementById("creationDefaults").addEventListener("click", function() {window.userData.genCreationDefaults();})


//distribution buttons
document.getElementById("showHistNorm").addEventListener("click", function() {
    window.userData.distribVisibilities[0] = !window.userData.distribVisibilities[0];
    updateHist(); })
document.getElementById("showHistSkew").addEventListener("click", function() {
    window.userData.distribVisibilities[1] = !window.userData.distribVisibilities[1];
    updateHist(); })
document.getElementById("showHistBeta").addEventListener("click", function() {
    window.userData.distribVisibilities[2] = !window.userData.distribVisibilities[2];
    updateHist(); })
document.getElementById("showHistGamma").addEventListener("click", function() {
    window.userData.distribVisibilities[3] = !window.userData.distribVisibilities[3];
    updateHist(); })
document.getElementById("showHistLogit").addEventListener("click", function() {
    window.userData.distribVisibilities[4] = !window.userData.distribVisibilities[4];
    updateHist(); })
document.getElementById("showHistLog").addEventListener("click", function() {
    window.userData.distribVisibilities[5] = !window.userData.distribVisibilities[5];
    updateHist(); })

const probDistribButton = document.getElementById("clickProbDistrib")
const cumDistribButton = document.getElementById("clickCumDistrib")
probDistribButton.addEventListener("click", function() {
    cumDistribButton.classList.remove("pressed");
    probDistribButton.classList.add("pressed");
    window.distribMode = "pdf"
    updateHist();
})
cumDistribButton.addEventListener("click", function() {
    probDistribButton.classList.remove("pressed");
    cumDistribButton.classList.add("pressed");
    window.userData.cdf = createCDF();
    window.distribMode = "cdf"
    updateHist();
})


//col width input
document.getElementById("histBucketInput").addEventListener("change", function() {
    window.userData.createHist(histBucketInput.value)
    createDistributionPDFs();
    updateHist(); })
//reset
document.getElementById("histBucketReset").addEventListener("click", function() {
    histBucketInput.value = 1
    window.userData.createHist(histBucketInput.value)
    createDistributionPDFs();
    updateHist();
})
const histogramButton = document.getElementById("histogramButton");
histogramButton.addEventListener("click", function () {
    window.currentTab = "hist";
    window.resetContainers();
    histogramContainer.style.display = "flex";
    histogramButton.classList.add("pressed");
    window.h.resize();

    histBucketInput.value = window.userData.histDefaultWidths[window.selectedSess]
    window.userData.createHist(histBucketInput.value)
    window.genSessionDistribData();
    window.updateHist();
    if (window.distribMode == "pdf") window.h.resetZoom();
    window.userData.genSlidingWindowDefaults(); window.userData.genCreationDefaults();
})



window.genSessionDistribData = function() {
    calculateDistributionCoeffs();
    createDistributionPDFs();

    createCDF()
    createDistributionCDFs();
    performAndersonDarlingTest();
    performKSTest();
}

// Update the histogram (with optional overlays)
window.updateHist = function () {
    console.log("updateHist called")

    if(window.distribMode == "pdf") {
        window.selectedSess = document.getElementById("title-dropdown").value;
        
        const hist = window.userData.hist[window.selectedSess];
        const distrib = window.userData.distribData;
        const dLabels = window.userData.distribLabels;
        const numDistribs = distrib.length;

        const numSolves = window.userData.solves[window.selectedSess].length;
        const bucketWidth = hist[1][0] - hist[0][0];
        
        // Start building combined data
        const combined = hist.map(([x, y], i) => {
            const row = [x, y/numSolves];

            for(let d = 0; d < numDistribs; d++) {
                if(window.userData.distribVisibilities[d]) {
                    row.push(distrib?.[d]?.[i]?.[1] * bucketWidth?? null);
                }
            }

            return row;
        });

        // Build labels array
        const labels = ["Time(s)", "Probability"];
        for(let d = 0; d < numDistribs; d++) {
            if(window.userData.distribVisibilities[d]) {
                labels.push(dLabels[d])
            }
        }

        // Update Dygraph
        window.h.updateOptions({
            file: combined,
            labels: labels,
        });
    }

    else if(window.distribMode == "cdf") {
        

        const cdf = window.userData.cdf

        const distribCdf = window.userData.distribCdfData
        const dLabels = window.userData.distribLabels;
        const numDistribs = distribCdf.length


        // Start building combined data
        const combined = cdf.map(([x, y], i) => {
            const row = [x, y];

            for(let d = 0; d < numDistribs; d++) {
                if(window.userData.distribVisibilities[d]) {
                    row.push(distribCdf?.[d]?.[i]?.[1] ?? null);
                }
            }

            return row;
        });

        // Build labels array
        const labels = ["Time(s)", "Probability"];
        for(let d = 0; d < numDistribs; d++) {
            if(window.userData.distribVisibilities[d]) {
                labels.push(dLabels[d])
            }
        }

        window.h.updateOptions({
            file: combined,
            labels: labels,
            xlabel: "Time(s)",
            ylabel: 'Probability',
            dateWindow: window.userData.cdfRange
        })
    }
    
};



function createHistRange(bucketSize, range,offset) {
    const bucketSize_ = parseFloat(bucketSize)
    const hist = []
    let j = window.selectedSess
    const solves = window.userData.solves[j]
    const numSolves = solves.length
    let max = 0;
    //find the max time
    for(let i = numSolves-range-offset; i < numSolves-offset; i++) {
        const time = solves[i][1]
        if(time > max) max = time;
    }
    //create the buckets
    for(let b = 0; b <= max+1; b+= bucketSize_) {
        hist.push([b,0]);
    }
    //add the solves to buckets
    for(let i = numSolves-range-offset; i < numSolves-offset; i++) {
        const time = solves[i][1];
        const bucket = Math.floor(time/bucketSize_);
        hist[bucket][1] += 1;
    }
    return hist;
}


window.createCDF = function() {
    console.log("createCDF called")

    const solves = window.userData.solves[window.selectedSess];
    const times = solves.map(s => s[1]);

    // Sort ascending
    const sorted = [...times].sort((a, b) => a - b);
    const n = sorted.length;
    const max = sorted[n-1]
    const min = sorted[0]

    const cdf = new Map(); // to deduplicate by keeping latest index

    for (let i = 0; i < n; i++) {
        const x = sorted[i];
        const y = (i + 1) / n;
        cdf.set(x, y); // later index overwrites earlier => keeps highest y
    }

    // Convert map to array of [time, cdf] points
    
    window.userData.cdfRange = [0,max];
    window.userData.cdf = Array.from(cdf.entries());
    return Array.from(cdf.entries());

}


//sliding window animation
async function animateHistRange() {
    const playBtn = document.getElementById("sldWinPlay")
    const progressBar = document.querySelector("#sldWinProgressBar div")
    //Flip button state and reset progress
    window.sldWinPlaying = true;
    playBtn.textContent = "Stop"
    progressBar.style.width = "0%"

    //get the parameters from the input elements
    const bucketSize = document.getElementById("sldWinWidth").value
    const range = document.getElementById("sldWinWindow").value
    const step = document.getElementById("sldWinStep").value 
    const xmax = document.getElementById("sldWinXmax").value 
    const frameTime = document.getElementById("sldWinTime").value
    const numSolves = window.userData.solves[window.selectedSess].length

    //just for the progress bar
    const totalFrames = Math.floor((numSolves - range) / step)
    let frame = 0;

    for(let i = numSolves-range; i > 0; i-=step) {
        if(!window.sldWinPlaying) break; //animation can be cancelled with stop button

        const hist = createHistRange(bucketSize,range,i)
        window.h.updateOptions({
            file: hist,
            dateWindow: [0,xmax],
            labels: ["Time(s)", "Frequency"],
        });

        await sleep(frameTime)

        //update progress bar
        frame++
        progressBar.style.width = `${(frame/totalFrames)*100}%`        
    }

    //reset the button
    playBtn.textContent = "Play";
    window.sldWinPlaying = false;
    progressBar.style.width = "0%"
}


//creation animation
async function animateHistCreate() {
    const playBtn = document.getElementById("creationPlay")
    const progressBar = document.querySelector("#creationProgressBar div")
    //Flip button state and reset progress
    window.creationPlaying = true;
    playBtn.textContent = "Stop"
    progressBar.style.width = "0%"

    //get the parameters from the input elements
    const step = parseFloat(document.getElementById("creationStep").value)
    const Xmax = parseFloat(document.getElementById("creationXmax").value)
    const bucketSize = parseFloat(document.getElementById("creationWidth").value)

    let j = window.selectedSess
    const solves = window.userData.solves[j]
    const numSolves = solves.length

    //for the progress bar
    const totalFrames = Math.floor(numSolves/step)
    let frame = 0;

    const hist = []
    
    let max = 0;
    //find the max time
    for(let i = 0; i < numSolves; i++) {const time = solves[i][1];if(time > max) max = time;}
    //create the buckets
    for(let b = 0; b <= max+1; b+= bucketSize) {hist.push([b,0]);}

    //add the solves to buckets
    for(let i = 0; i < numSolves; i++) {
        if(!window.creationPlaying) break; //animation can be cancelled with stop button

        const time = solves[i][1];
        const bucket = Math.floor(time/bucketSize);
        hist[bucket][1] += 1;

        //only draw every STEP frames, so animation isnt too slow
        if(i % step == 0) {
            window.h.updateOptions({
                file: hist,
                dateWindow: [0,Xmax],
                labels: ["Time(s)", "Frequency"],
            });

            //update progress bar
            frame++
            progressBar.style.width = `${(frame/totalFrames)*100}%`

            await sleep(1)
        } 
    }

    //reset the button
    playBtn.textContent = "Play";
    window.creationPlaying = false;
    progressBar.style.width = "0%"

}


function histogramTabStartup() {
    //Make sure its empty
    document.getElementById("histogramDiv").replaceChildren();

    //create dygraphs
    Dygraph.onDOMready(function onDOMready() {
        //Create the histogram
        window.h = new Dygraph(
            document.getElementById("histogramDiv"), //containing div
            window.userData.hist[window.selectedSess], //Data
            //Options
            {
                xlabel: "Time(s)",
                ylabel: "Frequency",
                stepPlot: true,
                fillGraph: true,
                color: themes[window.currentTheme]['--color-primary'],
                legend: "follow",
                fillAlpha: 0.5,
                //labelsSeparateLines: false,
            }
        );
    });

    window.genSessionDistribData();
    genDefaultColumnWidths();

    //styling for the distributions
    const dNames = window.userData.distribLabels
    const dColors = window.userData.distribColors
    for (let i = 0; i < dNames.length; i++) {
        window.h.updateOptions({ series: { [dNames[i]]: { fillGraph: false, stepPlot: false, color: [dColors[i]], strokeWidth: 2 } } })
    }

}

function genDefaultColumnWidths() {
    const solves = window.userData.solves
    const colWidths = []
    for (let j = 0; j < window.userData.numSessions; j++) {
        const times = [];

        //extract solves and find the max time
        for (let i = 0; i < solves[j].length; i++) {
            times.push(solves[j][i][1]);
        }

        // 2. Compute mean
        const mean = times.reduce((a, b) => a + b, 0) / times.length;

        // 3. Compute std deviation
        const std = Math.sqrt(times.reduce((sum, t) => sum + (t - mean) ** 2, 0) / times.length);

        // 4. Suggested col width
        const rawWidth = std / 6;
        //  Snap to closest power-of-two fraction (0.25, 0.5, 1, 2, 4, ...)
        const log2 = Math.round(Math.log2(rawWidth));
        const colWidth = Math.pow(2, log2);

        colWidths.push(colWidth)

    }
    window.userData.histDefaultWidths = colWidths;
    
}


//calculate the coefficients (parameters) for each of the types of distribution
function calculateDistributionCoeffs() {
    console.log("calculateDistributionCoeffs called")
    const stats = window.userData.histStats[window.selectedSess]
    const solveTimes = window.userData.solves[window.selectedSess].map(s => s[1]);
    const n =  window.userData.solves[window.selectedSess].length;
    const mean = stats[0], std = stats[1], max = stats[3]

    //--------------------NORMAL DISTRIBUTION--------------------    
    window.userData.normCoeffs = {mu: mean, sigma: std} //store the calculated coefficients


    //--------------------SKEW DISTRIBUTION--------------------
    // Estimate sample skewness γ1 = (1/n) ∑ ((x - μ)/σ)^3
    let skewness = solveTimes.reduce((sum, t) => sum + ((t - mean) / std) ** 3, 0) / n;
    //console.log("   real skewness:",skewness)
    //Max allowable is 1 or it explodes
    if(skewness > 0.99) skewness = 0.99; if(skewness < -0.99) skewness = -0.99;

    // Approximate shape parameter α from skewness (Pearson's method)
    const a = Math.abs(skewness) ** (2/3)
    const b = ((4-Math.PI)/2) ** (2/3);
    const delta = Math.sign(skewness) * Math.min(Math.sqrt(Math.PI / 2 * (a/(a+b))),window.userData.maxDelta);
    const alpha_skew = delta / Math.sqrt(1 - delta * delta)
    const omega_skew = std / Math.sqrt(1 - 2 * delta * delta / Math.PI);
    const xi_skew = mean - omega_skew * delta * Math.sqrt(2 / Math.PI);

    window.userData.skewCoeffs = {xi: xi_skew, omega: omega_skew, alpha: alpha_skew} //store the coefficients


    //--------------------BETA DISTRIBUTION--------------------
    const m = mean/max
    const v = (std ** 2) / (max ** 2);
    const alpha_beta = m * (m * (1-m) / v - 1);
    const beta_beta = (1-m) * (m * (1-m) / v - 1)

    window.userData.betaCoeffs = {alpha: alpha_beta, beta: beta_beta, max: max} //store coeffs


    //--------------------GAMMA DISTRIBUTION--------------------
    let meanLnX = solveTimes.reduce((sum, t) => sum + (Math.log(t)), 0) / n;
    let meanXLnX = solveTimes.reduce((sum, t) => sum + (t*Math.log(t)), 0) / n;

    //initial closed-form estimate
    let theta_gamma = meanXLnX - mean * meanLnX
    let alpha_gamma = mean / theta_gamma
    //console.log("   original alpha, theta",alpha_gamma,theta_gamma)

    //bias correction
    theta_gamma *= n / (n-1)
    alpha_gamma = alpha_gamma - (1/n) * 
        (3*alpha_gamma 
        - (2/3)*(alpha_gamma/(1+alpha_gamma)) 
        - (4/5)*(alpha_gamma/((1+alpha_gamma)**2)))
    //console.log("   new alpha, theta",alpha_gamma,theta_gamma)

    window.userData.gammaCoeffs = {alpha: alpha_gamma, theta: theta_gamma} //store coeffs


    //--------------------LOGIT DISTRIBUTION--------------------    
    const safeMax = max*1.01
    let meanLogit = solveTimes.reduce((sum, t) => sum + (logit(t/safeMax)), 0) / n;
    let stdLogit = solveTimes.reduce((sum, t) => sum + (logit(t/safeMax) - meanLogit) ** 2, 0) / n;
    //console.log("mean logit:",meanLogit,"std logit:",stdLogit)
    window.userData.logitCoeffs = {mu: meanLogit, sigma: stdLogit, max: safeMax}


    //--------------------LOG DISTRIBUTION--------------------
    const mu_log = Math.log((mean ** 2) / Math.sqrt((mean ** 2) + (std ** 2)))
    const var_log = Math.log(1 + (std ** 2) / (mean ** 2))

    window.userData.logCoeffs = {mu: mu_log, sigma: Math.sqrt(var_log)}
}


//create the probability distribution functions for all the different distributions
function createDistributionPDFs() {
    console.log("createDistributionPDFS called")
    const binData = window.userData.hist[window.selectedSess];
    const normCoeffs = window.userData.normCoeffs
    const skewCoeffs = window.userData.skewCoeffs
    const betaCoeffs = window.userData.betaCoeffs
    const gammaCoeffs = window.userData.gammaCoeffs
    const logitCoeffs = window.userData.logitCoeffs
    const logCoeffs = window.userData.logCoeffs

    //--------------------NORMAL DISTRIBUTION--------------------
    let sum = 0
    const normData = binData.map(([x]) => {
        const y = normalPDF(x, normCoeffs.mu, normCoeffs.sigma)
        sum += y;
        return [x, y];
    });
    //console.log("   norm sum:", sum)

    window.userData.distribData[0] = normData; //store the norm pdf


    //--------------------SKEW DISTRIBUTION--------------------
    sum = 0;
    const skewData = binData.map(([x]) => {
        const y = skewNormalPDF(x, skewCoeffs.xi, skewCoeffs.omega, skewCoeffs.alpha);
        sum += y;
        return [x, y];
    });
    //console.log("   skew sum:", sum);

    window.userData.distribData[1] = skewData; //store the skew pdf


    //--------------------BETA DISTRIBUTION--------------------
    sum = 0
    const betaData = binData.map(([x]) => {
        const y = betaPDF(x/betaCoeffs.max, betaCoeffs.alpha, betaCoeffs.beta) / betaCoeffs.max;
        sum += y;
        return [x, y];
    });
    //console.log("   beta sum:", sum)

    window.userData.distribData[2] = betaData; //store beta pdf


    //--------------------GAMMA DISTRIBUTION--------------------
    sum = 0
    const gammaData = binData.map(([x]) => {
        //const y = scale * normalPDF(x, stats[0], stats[1])
        const y = gammaPDF(x, gammaCoeffs.alpha, gammaCoeffs.theta);
        sum += y;
        return [x, y];
    });
    //console.log("   gamma sum:", sum)
    
    window.userData.distribData[3] = gammaData; //store gamma pdf


    //--------------------LOGIT DISTRIBUTION--------------------
    sum = 0
    //debugger
    const logitData = binData.map(([x]) => {
        const y = logitNormPDF(x/logitCoeffs.max, logitCoeffs.mu, logitCoeffs.sigma) / logitCoeffs.max
        sum += y
        return [x, y]
    })
    //console.log("   logit sum:", sum)

    window.userData.distribData[4] = logitData


    //--------------------LOG DISTRIBUTION--------------------
    sum = 0
    //debugger
    const logData = binData.map(([x]) => {
        const y = logPDF(x, logCoeffs.mu, logCoeffs.sigma)
        sum += y
        return [x, y]
    })
    //console.log("   log sum:", sum)

    window.userData.distribData[5] = logData

}


//create the cumulative distribution functions for all the different distributions
function createDistributionCDFs() {
    console.log("createDistributionCDFS called")
    const cdf = window.userData.cdf;
    const minVal = cdf[0][0];
    const maxVal = cdf[cdf.length-1][0]
    const density = cdf.length/(maxVal-minVal);

    const normCoeffs = window.userData.normCoeffs
    const skewCoeffs = window.userData.skewCoeffs
    const betaCoeffs = window.userData.betaCoeffs
    const gammaCoeffs = window.userData.gammaCoeffs
    const logitCoeffs = window.userData.logitCoeffs
    const logCoeffs = window.userData.logCoeffs

    //for some distributions, coding the CDF function is hard so I will just add up columns of the pdf
    const stepSize = 0.001
    let currentX = 0;
    let distribY = 0

    //--------------------NORMAL DISTRIBUTION--------------------
    const normCDF = []

    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        const distribY = generalNormalCDF(x, normCoeffs.mu, normCoeffs.sigma)
        normCDF.push([x,distribY])
    }
    window.userData.distribCdfData[0] = normCDF;


    //--------------------SKEW DISTRIBUTION--------------------
    //using integration by adding up columns
    const skewCdf = []

    currentX = 0;
    distribY = 0
    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        while(currentX < x) {
            distribY += skewNormalPDF(currentX, skewCoeffs.xi, skewCoeffs.omega, skewCoeffs.alpha)*stepSize
            currentX += stepSize;
        }
        skewCdf.push([x, distribY])
    }
    window.userData.distribCdfData[1] = skewCdf;


    //--------------------BETA DISTRIBUTION--------------------
    const betaCdf = []

    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        const distribY = betaCDF(x/betaCoeffs.max, betaCoeffs.alpha, betaCoeffs.beta)
        betaCdf.push([x, distribY])
    }
    window.userData.distribCdfData[2] = betaCdf;


    //--------------------GAMMA DISTRIBUTION--------------------
    //using integration by adding up columns
    const gammaCDF_ = []

    currentX = 0;
    distribY = 0
    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        while(currentX < x) {
            distribY += gammaPDF(currentX, gammaCoeffs.alpha, gammaCoeffs.theta) * stepSize
            currentX += stepSize
        }
        gammaCDF_.push([x,distribY])
    }
    window.userData.distribCdfData[3] = gammaCDF_;


    //--------------------LOGIT DISTRIBUTION--------------------
    const logitCDF = []

    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        const distribY = logitNormCDF(x/logitCoeffs.max, logitCoeffs.mu, logitCoeffs.sigma)
        logitCDF.push([x,distribY])
    }
    window.userData.distribCdfData[4] = logitCDF;


    //--------------------LOG DISTRIBUTION--------------------
    const logCDF_ = []

    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        const distribY = logCDF(x, logCoeffs.mu, logCoeffs.sigma)
        logCDF_.push([x,distribY])
    }
    window.userData.distribCdfData[5] = logCDF_;

}

function performAndersonDarlingTest() {
    const labels = window.userData.distribLabels
    const ids = window.userData.distribADids
    const testVals = []

    for(let d = 0; d < labels.length; d++) {
        const cdfData = window.userData.distribCdfData[d]
        const n = cdfData.length;
        let realN = n //adjust n if any terms are skipped so A^2 doesnt become negative

        let sum = 0;

        for (let i = 0; i < n; i++) {
            const F = cdfData[i][1];         // CDF at x_i
            const FComp = cdfData[n - 1 - i][1]; // CDF at x_{n - i}

            // Avoid log(0) or log(1)
            if (F <= 0 || F >= 1 || FComp <= 0 || FComp >= 1) {
                realN -= 1
                continue;
            }

            sum += (2 * (i + 1) - 1) * (Math.log(F) + Math.log(1 - FComp));
        }
        const aSquared = -realN - (sum / realN)
        //return -n - (sum / n);
        //console.log("a squared for ",labels[d],": ", aSquared)
        document.getElementById(ids[d]).innerText = aSquared.toFixed(2)
        document.getElementById(ids[d]).style.backgroundColor = ""
        testVals.push(aSquared)
    }

    let minId = 0
    for(let d = 0; d < labels.length; d++) {
        if(testVals[d] < testVals[minId]) minId = d
    }   
    document.getElementById(ids[minId]).style.backgroundColor = "#FFFF00"
}

function performKSTest() {
    const labels = window.userData.distribLabels
    const ids = window.userData.distribKSids
    const testVals = []

    for(let d = 0; d < labels.length; d++) {
        const cdf = window.userData.cdf
        const distribCdf = window.userData.distribCdfData[d]
        const n = cdf.length;
        let max = 0;
        //debugger;
        for (let i = 0; i < n; i++) {
            const err = Math.abs(cdf[i][1] - distribCdf[i][1])
            if(err > max) max = err
        }

        //return -n - (sum / n);
        //console.log("ks for ",labels[d],": ", max)
        document.getElementById(ids[d]).innerText = max.toFixed(3)
        document.getElementById(ids[d]).style.backgroundColor = ""
        testVals.push(max)
    }

    let minId = 0
    for(let d = 0; d < labels.length; d++) {
        if(testVals[d] < testVals[minId]) minId = d
    }   
    document.getElementById(ids[minId]).style.backgroundColor = "#FFFF00"
}
