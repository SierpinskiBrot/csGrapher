import { dhm } from "./utils.js"

export { updatePBTable, statisticsTabStartup }

//create the list for stats tab
function updatePBTable(sess, series) {
    const seriesStats = window.userData.pbInfo[sess][series]

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

function statisticsTabStartup() {
    updatePBTable(0,0)
}
