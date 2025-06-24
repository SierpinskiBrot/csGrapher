import {binarySearchInsertIdx, round, dhm, sleep, createButton, parseTime} from "./utils.js"
export {histogramTabStartup}
import {gamma, erf, normalPDF, standardNormalCDF, skewNormalPDF, betaPDF, gammaPDF, generalNormalCDF, betaCDF} from "./probabilities.js"
import {themes} from "./themes.js"


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
    createNormData(); createBetaData(); createSkewData(); createGammaData();
    updateHist(); })
//reset
document.getElementById("histBucketReset").addEventListener("click", function() {
    histBucketInput.value = 1
    window.userData.createHist(histBucketInput.value)
    updateHist(); })

window.genSessionDistribData = function() {
    createNormData()
    createBetaData()
    createSkewData()
    createGammaData()


    createCDF()
    createNormCDF()
    createSkewCDF()
    createBetaCDF()
    createGammaCDF()
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
        const scale = numSolves*bucketWidth;
        //console.log("scale:",scale,"numsolves",numSolves,"bucketwidth",bucketWidth)

        
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

    //styling for the distributions
    window.h.updateOptions({series : { "Normal Fit" : {fillGraph: false, stepPlot: false, color: "#00FF00", axis: "y1"}}})
    window.h.updateOptions({series : { "Skew Fit" : {fillGraph: false, stepPlot: false, color: "#0000FF", axis: "y1"}}})
    window.h.updateOptions({series : { "Beta Fit" : {fillGraph: false, stepPlot: false, color: "#FF0000", axis: "y1"}}})
    window.h.updateOptions({series : { "Gamma Fit" : {fillGraph: false, stepPlot: false, color: "#FF00FF", axis: "y1"}}})
}


function createNormData() {
    console.log("createNormData called")

    const binData = window.userData.hist[window.selectedSess];
    const stats = window.userData.histStats[window.selectedSess]

    let sum = 0
    const normData = binData.map(([x]) => {
        const y = normalPDF(x, stats[0], stats[1])
        sum += y;
        return [x, y];
    });
    console.log("norm sum:", sum)

    window.userData.distribData[0] = normData; //store the norm pdf
    window.userData.normCoeffs = {mu: stats[0], sigma: stats[1]} //store the calculated coefficients
}

function createSkewData() {
    console.log("createSkewData called")

    const binData = window.userData.hist[window.selectedSess];
    const stats = window.userData.histStats[window.selectedSess]; // [mean, std]
    const solveTimes = window.userData.solves[window.selectedSess].map(s => s[1]);
    const n =  window.userData.solves[window.selectedSess].length;

    // Estimate sample skewness γ1 = (1/n) ∑ ((x - μ)/σ)^3
    const mean = stats[0], std = stats[1];
    let skewness = solveTimes.reduce((sum, t) => sum + ((t - mean) / std) ** 3, 0) / n;
    console.log("real skewness:",skewness)
    //Max allowable is 1 or it explodes
    if(skewness > 0.99) skewness = 0.99;
    if(skewness < -0.99) skewness = -0.99;

    // Approximate shape parameter α from skewness (Pearson's method)
    const a = Math.abs(skewness) ** (2/3)
    const b = ((4-Math.PI)/2) ** (2/3);
    const delta = Math.sign(skewness) * Math.min(Math.sqrt(Math.PI / 2 * (a/(a+b))),window.userData.maxDelta);
    const alpha = delta / Math.sqrt(1 - delta * delta)
    const omega = std / Math.sqrt(1 - 2 * delta * delta / Math.PI);
    const xi = mean - omega * delta * Math.sqrt(2 / Math.PI);

    let sum = 0;
    const skewData = binData.map(([x]) => {
        const y = skewNormalPDF(x, xi, omega, alpha);
        sum += y;
        return [x, y];
    });
    console.log("Skew sum:", sum);

    window.userData.distribData[1] = skewData; //store the skew pdf
    window.userData.skewCoeffs = {xi: xi, omega: omega, alpha: alpha} //store the coefficients
}


function createBetaData() {
    console.log("createBetaData called")

    const binData = window.userData.hist[window.selectedSess];
    const stats = window.userData.histStats[window.selectedSess]
    const mean = stats[0], std = stats[1], max = stats[3]

    const m = mean/stats[3]
    const v = (std ** 2) / (max ** 2);
    const alpha = m * (m * (1-m) / v - 1);
    const beta = (1-m) * (m * (1-m) / v - 1)

    let sum = 0
    const betaData = binData.map(([x]) => {
        const y = betaPDF(x/max, alpha, beta) / max;
        sum += y;
        return [x, y];
    });
    console.log("beta sum:", sum)

    
    window.userData.distribData[2] = betaData; //store beta pdf
    window.userData.betaCoeffs = {alpha: alpha, beta: beta, max: max} //store coeffs
}

function createGammaData() {
    console.log("createGammaData called")

    const binData = window.userData.hist[window.selectedSess];
    const stats = window.userData.histStats[window.selectedSess]
    const solveTimes = window.userData.solves[window.selectedSess].map(s => s[1]);
    const n =  window.userData.solves[window.selectedSess].length;
    
    
    const meanX = stats[0], std = stats[1], max = stats[3]
    let meanLnX = solveTimes.reduce((sum, t) => sum + (Math.log(t)), 0) / n;
    let meanXLnX = solveTimes.reduce((sum, t) => sum + (t*Math.log(t)), 0) / n;

    //initial closed-form estimate
    let theta = meanXLnX - meanX * meanLnX
    let alpha = meanX / theta
    console.log("original alpha, theta",alpha,theta)

    //bias correction
    theta *= n / (n-1)
    alpha = alpha - (1/n) * (3*alpha - (2/3)*(alpha/(1+alpha)) - (4/5)*(alpha/((1+alpha)**2)))
    console.log("new alpha, theta",alpha,theta)

    let sum = 0
    const gammaData = binData.map(([x]) => {
        //const y = scale * normalPDF(x, stats[0], stats[1])
        const y = gammaPDF(x, alpha, theta);
        sum += y;
        return [x, y];
    });
    console.log("gamma sum:", sum)

    
    window.userData.distribData[3] = gammaData; //store gamma pdf
    window.userData.gammaCoeffs = {alpha: alpha, theta: theta} //store coeffs
}

function createNormCDF() {
    console.log("createNormCDF called")

    //debugger;
    const cdf = window.userData.cdf;
    const normCDF = []
    const mu = window.userData.normCoeffs.mu
    const sigma = window.userData.normCoeffs.sigma

    let error = 0;

    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        const distribY = generalNormalCDF(x, mu, sigma)
        normCDF.push([x,distribY])

        const y = cdf[i][1];
        error += Math.abs(y-distribY)
    }
    console.log("norm error:",error*100/cdf.length)

    const minVal = cdf[0][0];
    const maxVal = cdf[cdf.length-1][0]
    const density = cdf.length/(maxVal-minVal);
    //console.log("density",density,"minVal",minVal)
    for(let i = 0; i < density*minVal; i++) {
        error += generalNormalCDF(i/density, mu, sigma)
    }
    console.log("new norm error:",error*100/(cdf.length+density*minVal))

    document.getElementById("normError").innerText = round(error*100/(cdf.length+density*minVal),2)

    window.userData.distribCdfData[0] = normCDF;
}

function createBetaCDF() {
    console.log("createBetaCDF called")
    //debugger;
    const cdf = window.userData.cdf;
    const betaCdf = []
    const alpha = window.userData.betaCoeffs.alpha  
    const beta = window.userData.betaCoeffs.beta
    const max = window.userData.betaCoeffs.max
    
    let error = 0

    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        const distribY = betaCDF(x/max, alpha, beta)
        betaCdf.push([x, distribY])

        const y = cdf[i][1];
        error += Math.abs(y-distribY)
    }
    console.log("beta error:",error*100/cdf.length)

    const minVal = cdf[0][0];
    const maxVal = cdf[cdf.length-1][0]
    const density = cdf.length/(maxVal-minVal);
    //console.log("density",density,"minVal",minVal)
    for(let i = 0; i < density*minVal; i++) {
        error += betaCDF((i/density)/max, alpha, beta)
    }
    console.log("new beta error:",error*100/(cdf.length+density*minVal))

    document.getElementById("betaError").innerText = round(error*100/(cdf.length+density*minVal),2)

    window.userData.distribCdfData[2] = betaCdf;
}

function createSkewCDF() {
    //calculating the real cdf for a skew normal distribution seems reall hard
    //so I will just add up a bunch of columns
    console.log("createSkewCDF called")
    //debugger;
    const cdf = window.userData.cdf;
    const skewCdf = []
    const xi = window.userData.skewCoeffs.xi
    const omega = window.userData.skewCoeffs.omega
    const alpha = window.userData.skewCoeffs.alpha
    
    const minVal = cdf[0][0];

    const stepSize = 0.001
    let error = 0
    let currentX = 0;
    let distribY = 0

    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]

        while(currentX < x) {
            distribY += skewNormalPDF(currentX, xi, omega, alpha)*stepSize
            currentX += stepSize;
        }

        skewCdf.push([x, distribY])

        const y = cdf[i][1];
        error += Math.abs(y-distribY)
    }
    console.log("skew error:",error*100/cdf.length)


    const maxVal = cdf[cdf.length-1][0]
    const density = cdf.length/(maxVal-minVal);
    //console.log("density",density,"minVal",minVal)

    currentX = 0;
    distribY = 0
    for(let i = 0; i < density*minVal; i++) {
        //console.log("i:",i,"density:",density,"minVal",minVal)
        while(currentX < i/density) {
            distribY += skewNormalPDF(currentX, xi, omega, alpha)*stepSize
            currentX += stepSize;
        }
        error += distribY
        
    }
    console.log("new skew error:",error*100/(cdf.length+density*minVal))

    document.getElementById("skewError").innerText = round(error*100/(cdf.length+density*minVal),2)
    

    window.userData.distribCdfData[1] = skewCdf;
}

function createGammaCDF() {
    console.log("createGammaCDF called")

    //debugger;
    const cdf = window.userData.cdf;
    const gammaCDF_ = []
    const alpha = window.userData.gammaCoeffs.alpha
    const theta = window.userData.gammaCoeffs.theta

    const stepSize = 0.001
    let error = 0
    let currentX = 0;
    let distribY = 0

    for(let i = 0; i < cdf.length; i++) {
        const x = cdf[i][0]
        while(currentX < x) {
            distribY += gammaPDF(currentX, alpha, theta) * stepSize
            currentX += stepSize
        }
        gammaCDF_.push([x,distribY])

        const y = cdf[i][1];
        error += Math.abs(y-distribY)
    }
    console.log("gamma error:",error*100/cdf.length)

    const minVal = cdf[0][0];
    const maxVal = cdf[cdf.length-1][0]
    const density = cdf.length/(maxVal-minVal);
    //console.log("density",density,"minVal",minVal)
    currentX = 0;
    distribY = 0
    for(let i = 0; i < density*minVal; i++) {
        while(currentX < i/density) {
            distribY += gammaPDF(currentX, alpha, theta)*stepSize
            currentX += stepSize
        }
        error += distribY
    }
    console.log("new gamma error:",error*100/(cdf.length+density*minVal))

    document.getElementById("gammaError").innerText = round(error*100/(cdf.length+density*minVal),2)

    window.userData.distribCdfData[3] = gammaCDF_;
}

