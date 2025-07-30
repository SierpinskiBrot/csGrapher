import { dhm } from "./utils.js"
import { themes } from "./themes.js"
export { updatePBTable, pbTabStartup }

//create the list for stats tab
function updatePBTable(sess, series) {

    //calcRegressionCoeffs(sess, series)
    drawPBPredictionGraphs(sess, series)
    const seriesStats = window.userData.pbInfo[sess][series]
    document.getElementById("bestSince").innerText = `The best time since your last PB was ${seriesStats.bestSinceLastPB.toFixed(3)}s`
    const pbStatsBody = document.getElementById("pbStatsBody")
    pbStatsBody.replaceChildren();

    for (let i = seriesStats.times.length - 1; i >= 0; i--) {
        let newRow = document.createElement("tr");

        //Date column
        let dateCol = document.createElement("td");
        let date = seriesStats.dates[i]
        let dateStr = date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear(); //month is 0-indexed for some reason
        dateCol.innerHTML = dateStr;

        //PB For Time column
        let date2 = new Date();
        let dateDiff = 0;
        let pbForTimeCol = document.createElement("td")
        if (i == seriesStats.dates.length - 1) { //most recent record
            dateDiff = Math.abs(date2 - date);
            pbForTimeCol.innerHTML = dhm(dateDiff) + " and counting";
        }
        else { //everything else
            date2 = seriesStats.dates[i + 1]
            dateDiff = Math.abs(date2 - date)
            pbForTimeCol.innerHTML = dhm(dateDiff);
        }

        //Solve # column
        let solveCol = document.createElement("td")
        solveCol.innerHTML = seriesStats.solveNums[i]

        //PB for # solves column
        let solves = seriesStats.solveNums[i]
        let nextSolves = window.userData.solves[sess].length;
        if (i < seriesStats.times.length - 1) {  //Is not the current pb
            nextSolves = seriesStats.solveNums[i + 1]
        }
        let solvesPassed = nextSolves - solves;
        if (i == seriesStats.times.length - 1) solvesPassed += " and counting"  //Is the current pb
        let pbForSolvesCol = document.createElement("td");
        pbForSolvesCol.innerHTML = solvesPassed;

        //Solve time column
        let timeCol = document.createElement("td");
        timeCol.innerHTML = seriesStats.times[i].toFixed(3)

        newRow.appendChild(timeCol);
        newRow.appendChild(dateCol);
        newRow.appendChild(pbForTimeCol);
        newRow.appendChild(solveCol);
        newRow.appendChild(pbForSolvesCol);

        pbStatsBody.appendChild(newRow);
    }
}

function pbTabStartup() {
    updatePBTable(0, 0)
    drawPBPredictionGraphs(0,0)
}

function drawPBPredictionGraphs(sess, series) {
    //debugger;
    const seriesStats = window.userData.pbInfo[sess][series]
    const solveNums = seriesStats.solveNums
    const times = seriesStats.times
    const dates = seriesStats.dates

    const timePassed = []
    for (let i = 1; i < dates.length; i++) {
        timePassed.push(Math.abs(dates[i] - dates[0]) / 1000)
    }

    //draw graphs and get predictions
    const solveNumP = drawGraph(solveNums, "solveNumRegression", "Solve #")
    const timeP =     drawGraph(times, "solveTimeRegression", "Time")
    const dateP = drawGraph(timePassed, "solveDateRegression", "Date")

    //parse date prediction into a string
    let predictedDate = null;
    let dateStr = "N/A";
    if(dates.length != 0) {
        predictedDate = new Date(dates[0].getTime() + Math.ceil(dateP * 1000))
        dateStr = predictedDate.getDate() + "/" + (predictedDate.getMonth() + 1) + "/" + predictedDate.getFullYear();
    }

    //write the predictions
    document.getElementById("solveNumPrediction").innerText = `Next PB will happen around Solve # ${Math.ceil(solveNumP)}`
    document.getElementById("solveTimePrediction").innerText = `Next PB will be around ${timeP.toFixed(3)}s`
    document.getElementById("solveDatePrediction").innerText = `Next PB will happen around ${dateStr}`

}

function drawGraph(data, graphId, ylabel) {
    //debugger;
    const ctx = document.getElementById(graphId).getContext("2d");
    const n = data.length
    const max = data.reduce((a, b) => Math.max(a, b), -Infinity);
    const w = document.getElementById(graphId).width
    const h = document.getElementById(graphId).height
    const margin = 40

    //fill the background
    ctx.fillStyle = themes[window.currentTheme]['--color-surface']
    ctx.fillRect(0, 0, w, h);

    //draw axes
    ctx.strokeStyle = "#000000"
    ctx.fillStyle = "#000000"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(margin, 0)
    ctx.lineTo(margin, h)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, h - margin)
    ctx.lineTo(w, h - margin)
    ctx.stroke()
    //draw labels
    ctx.font = "bold 24px serif";
    ctx.fillText("PB #", w / 2, h - 14)
    ctx.save();
    ctx.translate(w - 1, 0)
    ctx.rotate(3 * Math.PI / 2)
    //ctx.textAlign = "right";
    ctx.fillText(ylabel, -h/1.8, -(w-30))
    ctx.restore()

    //draw the actual data
    ctx.strokeStyle = themes[window.currentTheme]['--color-primary']
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const canvasX = margin + (i) * (w - margin) / (n + 1)
        const canvasY = h - margin - (h - margin) * (data[i] / (1.2 * max))
        if (i == 0) { ctx.moveTo(canvasX, canvasY) }
        else        { ctx.lineTo(canvasX, canvasY) }
    }
    ctx.stroke();

    //calc the slope and intercept for prediction line
    const rangeForSlope = Math.max(2, Math.floor(0.2 * n))
    const slope = (data[n - 1] - data[n - 1 - rangeForSlope]) / rangeForSlope
    const c = data[n - 1] - slope * (n - 1)

    //draw the prediction line
    ctx.strokeStyle = themes[window.currentTheme]['--color-secondary']
    ctx.beginPath();
    ctx.moveTo(margin, h - margin)
    for (let i = 0; i < 100; i++) {
        const x = (i) * (n + 1) / 100
        const y = x * slope + c

        const canvasX = margin + x * (w - margin) / (n + 1);
        const canvasY = h - margin - (h - margin) * (y / (1.2 * max))

        if (i == 0 || i % 2 == 0 || canvasY > h - margin) { ctx.moveTo(canvasX, canvasY) }
        else                                              { ctx.lineTo(canvasX, canvasY) }

    }
    ctx.stroke();

    const prediction = slope * (n) + c
    //console.log(ylabel, prediction)
    return prediction;
}

