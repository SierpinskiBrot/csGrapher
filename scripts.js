import "./lib/dygraph.js";

//              x,     y
var logScale = [false, false]

var userData = null;
window.selectedSess = 0; //selected session from the cstimer


function round(num, decimalPlaces = 0) {
    num = Math.round(num + "e" + decimalPlaces);
    return Number(num + "e" + -decimalPlaces);
}

function createButton(labelText, onClick, className = "") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = labelText;
    if (className) btn.className = className;
    btn.addEventListener("click", onClick);
    return btn;
}


//handle the toolbar buttons on the top
window.currentTab = "graph";
const graphButton = document.getElementById("graphButton");
const histogramButton = document.getElementById("histogramButton");
const statsButton = document.getElementById("statsButton");
const graphContainer = document.getElementById("graphContainer");
const histogramContainer = document.getElementById("histogramContainer");
const statsContainer = document.getElementById("statsContainer");
function resetContainers() {
    histogramContainer.style.display = "none";
    histogramButton.classList.remove("pressed");
    statsContainer.style.display = "none";
    statsButton.classList.remove("pressed");
    graphContainer.style.display = "none";
    graphButton.classList.remove("pressed");
}
graphButton.addEventListener("click", function() {
    resetContainers();
    graphContainer.style.display = "flex";
    graphButton.classList.add("pressed");
    window.g.resize();
    window.updateGraph(); window.g.resetZoom()
    window.currentTab = "graph";
})
histogramButton.addEventListener("click", function() {
    resetContainers();
    histogramContainer.style.display = "flex";
    histogramButton.classList.add("pressed");
    window.h.resize();
    window.updateHist(); window.h.resetZoom()
    window.currentTab = "hist";
})
statsButton.addEventListener("click", function() {
    resetContainers();
    statsContainer.style.display = "flex";
    statsButton.classList.add("pressed");
    window.userData.updatePBTable(window.selectedSess)
    window.currentTab = "stats";
})

//The buttons on the right of the graph screen
const xSelectDate = document.getElementById("xSelectDate");
const xSelectSolve = document.getElementById("xSelectSolve");
const xSelectLinear = document.getElementById("xSelectLinear");
const xSelectLog = document.getElementById("xSelectLog");
const ySelectLinear = document.getElementById("ySelectLinear");
const ySelectLog = document.getElementById("ySelectLog");
//Handle swapping between Date and Solve# on the x-axis
function xSwapData() {
    if(window.userData != undefined && window.g != undefined) {
        [window.userData.solves, window.userData.solves2] = [window.userData.solves2, window.userData.solves];
        [window.userData.xTitle, window.userData.xTitle2] = [window.userData.xTitle2, window.userData.xTitle];
        window.updateGraph();
        window.g.resetZoom();
    }
};
xSelectDate.addEventListener("click", function() { if(window.userData.xTitle != "Date") xSwapData(); });
xSelectSolve.addEventListener("click", function() { if(window.userData.xTitle != "Solve #") xSwapData(); });
//Handle swapping between Linear and Log on the x-axis
function xSwapScale() {
    if(window.userData != undefined && window.g != undefined) {
        logScale[0] = !logScale[0];
        window.g.updateOptions({ axes : { x : {  logscale : logScale[0] } } })
        window.g.updateOptions({ xlabel: (logScale[0] ? "Log(": "") + window.userData.xTitle + (logScale[0] ? ")": "")})
        window.dropdown = window.document.getElementById("title-dropdown");
        window.dropdown.value = window.selectedSess;
    }
};
xSelectLinear.addEventListener("click", function() { if(logScale[0] == true) xSwapScale(); });
xSelectLog.addEventListener("click", function() { if(logScale[0] == false) xSwapScale(); });
//Handle swapping between Linear and Log on the y-axis
function ySwapScale() {
    if(window.userData != undefined && window.g != undefined) {
        logScale[1] = !logScale[1];
        window.g.updateOptions({  logscale : logScale[1] })
        window.g.updateOptions({ ylabel: (logScale[1] ? "Log(": "") + "Time(s)" + (logScale[1] ? ")": "")})
        window.dropdown = window.document.getElementById("title-dropdown");
        window.dropdown.value = window.selectedSess;
    }
};
ySelectLinear.addEventListener("click", function() { if(logScale[1] == true) ySwapScale(); });
ySelectLog.addEventListener("click", function() { if(logScale[1] == false) ySwapScale(); });


//This code is run after the user uploads a file
const jsonDataFile = document.getElementById("UploadFile");
jsonDataFile.addEventListener("change", function() {

    var GetFile = new FileReader;
    GetFile .onload=function(){
        const result = GetFile.result;
        //console.log(result);
        var jsonData = JSON.parse(result);
        //parse the data into better arrays
        window.userData = new UserData(jsonData)

        //Create the dropdown for the title of the graph and set its functionality
        if(document.getElementById("title-dropdown")) document.getElementById("title-dropdown").remove()
        window.dropdown = document.createElement("select");
        window.dropdown.setAttribute("id","title-dropdown")
        for (let i = 0; i < 15; i++) {
            if(window.userData.sessions[i]) {
                let child = document.createElement("option");
                child.value = i;
                child.innerHTML = window.userData.sessions[i];
                window.dropdown.appendChild(child);
            }
        }
        window.dropdown.setAttribute("value", window.selectedSess);
        window.dropdown.addEventListener("change", function() {
            //Only update what is on screen so it is a bit faster
            if(window.currentTab == "graph") { window.updateGraph(); window.g.resetZoom() }
            else if (window.currentTab == "hist") { window.updateHist(); window.h.resetZoom() }
            else if (window.currentTab == "stats") { window.userData.updatePBTable(window.dropdown.value) }
        })
        document.getElementById("header").appendChild(window.dropdown)

        //Reset the buttons on the right
        xSelectDate.checked = true;
        xSelectLinear.checked = true;
        ySelectLinear.checked = true;

        //Create the main graph
        Dygraph.onDOMready(function onDOMready() {
            window.g = new Dygraph(
                document.getElementById("graphdiv"), // containing div
                window.userData.solves[window.selectedSess], //Data
                //Options
                {
                    labels: window.userData.labels,
                    xlabel: window.userData.xTitle,
                    ylabel: "Time(s)",
                    legend: "always",
                    color: "#084C61",
                    labelsDiv: document.getElementById("legendLine"),
                    labelsSeparateLines: false,
                }
            );
            window.h = new Dygraph(
                document.getElementById("histogramDiv"), //containing div
                window.userData.hist[window.selectedSess], //Data
                //Options
                {
                    xlabel: "Time(s)",
                    ylabel: "Frequency",
                    stepPlot: true,
                    fillGraph: true,
                    color: "#DB3A34",
                    fillAlpha: 0.5
                }
            );
        });
        
        //Line styling for each line
        for(let i = 1; i < window.userData.labels.length; i++) {
            const label_ = window.userData.labels[i]
            const color_ = window.userData.colors[i-1]
            //Default setup
            window.g.updateOptions({series : { 
                [label_] : {
                    color : color_,
                    strokeWidth : 2
                }
            }})
            //Dashed line for pb
            if(label_[0] == 'P') {
                window.g.updateOptions({series : { [label_] : {strokePattern: Dygraph.DASHED_LINE}}})
            }
            //Points for time
            if(label_ == 'Time') {
                window.g.updateOptions({series : { [label_] : {
                    strokeWidth: 0,
                    drawPoints: true,
                    pointSize: 2}}})
            }
        }

       //create the series toggle buttons
       document.getElementById("graphLeftButtons").replaceChildren(); //delete any existing buttons on the left
       const leftButtonsTitle = document.createElement("div");
       const leftButtonsTitleText = document.createElement("p");
       leftButtonsTitleText.innerHTML = "Series:"
       leftButtonsTitle.appendChild(leftButtonsTitleText)
       leftButtonsTitle.classList.add("buttonsTitle")
       document.getElementById("graphLeftButtons").appendChild(leftButtonsTitle);
       for(let i = 1; i < window.userData.labels.length; i++) {
            //create the button
            const newButton = createButton(window.userData.labels[i], (e) => {
                const currentVisibility = window.userData.visibilities[i-1];
                window.userData.visibilities[i-1] = !currentVisibility;
                window.g.setVisibility(window.userData.visibilities, true);
                const tgt = e.target.closest('button');
                tgt.classList.toggle('pressed');
            })
            const color_ = window.userData.colors[i-1];
            newButton.style = "background:" + color_ + "; border-color: " + color_
            //redundant as visibility is reset when a file is uploaded
            if(!window.userData.visibilities[i-1]) newButton.classList.toggle('pressed')
            //line breaks after buttons that say pb
            document.getElementById("graphLeftButtons").appendChild(newButton);
            if(window.userData.labels[i][0] == 'P') {
                document.getElementById("graphLeftButtons").appendChild(document.createElement("br"));                
            }
        }

        //create the histogram buttons
        const subdivideHist = createButton("Subdivide", function() {
            console.log("SUBDIVIDING!!!")
            window.userData.subdivide();
            updateHist();
        })
        const resetSubdivide = createButton("Reset", function() {
            window.userData.resetSubdivision();
            updateHist();
        })
        const histLeftButtons = document.getElementById("histLeftButtons")
        histLeftButtons.replaceChildren();
        histLeftButtons.appendChild(subdivideHist)
        histLeftButtons.appendChild(resetSubdivide)

        //create the pb table
        window.userData.updatePBTable(0);
    }

    GetFile.readAsText(this.files[0]);
});




//Update the graph
window.updateGraph = function() {
    window.selectedSess = document.getElementById("title-dropdown").value;
    window.g.updateOptions({
        file: window.userData.solves[window.selectedSess], 
        xlabel: (logScale[0] ? "Log(": "") + window.userData.xTitle + (logScale[0] ? ")": ""),
        ylabel: (logScale[1] ? "Log(": "") + "Time(s)" + (logScale[1] ? ")": "")
    });
};
//Update the histogram
window.updateHist = function() {
    window.selectedSess = document.getElementById("title-dropdown").value;
    window.h.updateOptions({
        file: window.userData.hist[window.selectedSess]
    });
};

class UserData {
    constructor(data) {
        /** Incoming data format from csTimer
         *  {
         *      "session1":[[[solve1 time modifier, solve1 time],solve1 scramble,idk, solve1 UTC],[same shit for solve 2 and so on],[solve3],[...]],
         *      "session2":[[[solve1 time modifier, solve1 time],solve1 scramble,idk, solve1 UTC],[same shit for solve 2 and so on],[solve3],[...]],
         *      "...": [...],
         *      "properties":
         *          {
         *              "sessionData":
         *                  {
         *                      "session # (1-15)": 
         *                          {
         *                              "name": name of session,
         *                              "opt": options like the scramble type,
         *                              "rank": idk
         *                              "stat": [#of solves, #of dnfs, mean time(ms)],
         *                              "date": [solve1 UTC, most recent solve UTC]
         *                          },
         *                      "...": ...
         *                  }
         *              "useMilli": true/false,
         *              "...useless stuff...""
         *              "statalu": all the stats you see on the left, mine is "mo3 ao5 ao12 ao50 ao100 ao200 ao500 ao1000",
         *              "...just a bunch more useless stuff...": ...
         *          }
         * }
         */

        this.xTitle = "Date";
        this.xTitle2 = "Solve #";

        this.labels = [ "Date", "Time","PB Single", "ao5", "PB ao5", "ao12", "PB ao12", "ao100","PB ao100", "ao1000","PB ao1000" ];
        this.colors = ["#084C61","#084C61","#177E89","#177E89","#85A06A","#85A06A","#FFAD0A","#FFAD0A","#E45E3D","#E45E3D"];
        this.visibilities = [true,true,true,true,true,true,true,true,true,true];

        //   date, time, pb s, mo3, pb mo3, ao5, pb ao5, ao12, pb ao12, ao50, pb ao50, ao100, pb ao100, ao1000, pbao1000
        this.solves = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
        //solve #, time, pb s, mo3, pb mo3, ao5, pb ao5, ao12, pb ao12, ao50, pb ao50, ao100, pb ao100, ao1000, pbao1000
        this.solves2 = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];

        //histogram
        //this.hist is what is displayed, this.buckets is the data of each solve in its bucket for when we want to subdivide
        //  hist[session] [0]: bucket name(0,1,...), [1]: # of solves
        this.hist = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
        this.histOld; //reset to this when reset button clicked
        this.step = 0.5; //current bucket size / 2
        //  buckets[session] bucket(0,1,...), [every solve in that bucket]
        this.buckets = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
        this.bucketsOld; //reset to this when reset button clicked

        //names of sessions
        this.sessions = [];

        //pb data for stats panel
        //  pbData[session][series] [0]: title, [1]: time(s), [2]: solves since last, [3]: days since last, [4]: date 
        this.pbData = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];

        //Add the first two columns: solve date, solve tiem
        for (let s = 1; s <= 15; s++) {
            const sessionKey = `session${s}`;
            if (data[sessionKey] !== undefined) {
                for (let i = 0; i < data[sessionKey].length; i++) {
                    //Append col for the solve dates
                    this.solves[s - 1].push([new Date(1000 * data[sessionKey][i][3])]);

                    //Append col for the solve times
                    //console.log("S: " + s + ", i: " + i)
                    this.solves[s - 1][i].push(0.001*this.parseTime(data[sessionKey][i][0]))
                }
            }
        }

        //Delete DNFs
        for(let j = 0; j < 15; j++) {
            for(let i = 0; i < this.solves[j].length; i++) {
                if(this.solves[j][i][1] == 0) {
                    this.solves[j].splice(i,1);
                }
            }
        }

        //Get the session names
        if(data.properties.sessionData != undefined){
            const sessionData = JSON.parse(data.properties.sessionData)
            for(let i = 0; i < 15; i++) {
                if(sessionData[i] != undefined){this.sessions.push(sessionData[i].name)}
            }
        }
        
        //create the default data series
        this.pbsOfLastCol(1);
        this.pushAvg(5);
        this.pbsOfLastCol(5);
        this.pushAvg(12);
        this.pbsOfLastCol(12);
        this.pushAvg(100);
        this.pbsOfLastCol(100);
        this.pushAvg(1000);
        this.pbsOfLastCol(1000);

        //This creates solves2, which is solves but x-axis is solve#
        for(let i = 0; i < 15; i++) {
            for(let k = 0; k < this.solves[i].length; k++) {
                this.solves2[i].push(Array.from(this.solves[i][k]))
                this.solves2[i][k][0] = k+1;
            }
        }

        //add the data for histogram
        for(let j = 0; j < 15; j++) {
            let max = 0;
            //find the max time
            for(let i = 0; i < this.solves[j].length; i++) {
                const time = this.solves[j][i][1]
                if(time > max) max = time;
            }
            //create the buckets
            for(let b = 0; b <= max; b++) {
                this.hist[j].push([b,0]);
                this.buckets[j].push([b]);
            }
            //add the solves to buckets
            for(let i = 0; i < this.solves[j].length; i++) {
                const time = this.solves[j][i][1];
                const bucket = Math.floor(time);
                this.hist[j][bucket][1] += 1;
                this.buckets[j][bucket].push(time);
            }
        }
        this.histOld = JSON.parse(JSON.stringify(this.hist));
        this.bucketsOld = JSON.parse(JSON.stringify(this.buckets));

    }


    subdivide() {
        for(let j = 0; j < 15; j++) {
            //Update the buckets first
            for(let b = 0; b < this.buckets[j].length; b++) {
                const bucketVal = this.buckets[j][b][0]
                
                const left = [bucketVal]
                const right = [bucketVal+this.step]

                for(let i = 1; i < this.buckets[j][b].length; i++) {
                    const time = this.buckets[j][b][i]
                    if(time > bucketVal+this.step) right.push(time)
                    else left.push(time)
                }

                this.buckets[j][b] = left;
                this.buckets[j].splice(b+1,0,right)
                b++ //skip over next bucket because IT IS THE ONE WE JUST CREATED
            }
            //Get the histogram data from the buckets
            this.hist[j] = [];
            for(let b = 0; b < this.buckets[j].length;b++) {
                this.hist[j].push([this.buckets[j][b][0],this.buckets[j][b].length-1])
            } 
        }
        this.step /= 2
    }

    resetSubdivision() {
        this.hist = JSON.parse(JSON.stringify(this.histOld));
        this.buckets = JSON.parse(JSON.stringify(this.bucketsOld));
        this.step = 0.5;
    }
    
    //append a column for the average of the x last solves
    pushAvg(x) {
        for (let j = 0; j < 15; j++) {
          const solves = this.solves[j];
          const clip = Math.ceil(0.05 * x); //Remove top and bottom 5% of solves
          let windo = [];
      
          for (let i = 0; i < solves.length; i++) {
            if (i < x - 1) { //Cant make an average without enough data
              solves[i].push(NaN); 

              // Insert new solve time in sorted position
              const newVal = solves[i][1];
              const insertIdx = windo.findIndex(val => val > newVal);
              if (insertIdx === -1) windo.push(newVal);
              else windo.splice(insertIdx, 0, newVal);

            } else {
              // Remove oldest if window is full
              if (windo.length === x) {
                const old = solves[i - x][1];
                const idx = windo.findIndex(val => val === old);
                if (idx !== -1) windo.splice(idx, 1);
              }
      
              // Insert new solve time in sorted position
              const newVal = solves[i][1];
              const insertIdx = windo.findIndex(val => val > newVal);
              if (insertIdx === -1) windo.push(newVal);
              else windo.splice(insertIdx, 0, newVal);
      
              // Copy clipped portion
              const trimmed = windo.slice(clip, x - clip);
              const sum = trimmed.reduce((a, b) => a + b, 0);
              const mean = sum / trimmed.length;
              solves[i].push(mean);
            }
          }
        }
    }

    /*
    the times are stored in array [t1,t2]
        t2: solve time in milliseconds
        t1: 
             0: normal solve
          2000: +2 (add 2000 milliseconds)
            -1: dnf - delete that shit
    */
    parseTime(t) {
        if(t[0] == 0) {return t[1];}               //normal solve
        else if(t[0] == 2000) {return t[1] + 2000} //+2
        else if(t[0] == -1) {return 0}             //dnf
        //erroneous time
        else {
            console.log("error parsing time:")
            console.log("t1 of " + t[0] + "does not correlate with a +2 or a dnf")
        }
    }

    //Append a col for the pb of the previous col
    pbsOfLastCol(x) {
        console.log("doing pbs of last col")
        
        //do this for each session
        for(let j = 0; j < 15; j++){
            if(this.solves[j].length != 0) {

                const pbStats = [[],[],[],[]];
                pbStats[0] = x;    
                
                //index of the last col in session
                const idx = this.solves[j][this.solves[j].length-1].length - 1;
                //find the first valid index - 
                //for a pb ao12, this would be 12
                let firstValIdx = 0
                for(let i = 0; i < this.solves[j].length; i++) {
                    firstValIdx += 1;
                    this.solves[j][i].push(this.solves[j][i][idx])
                    if(this.solves[j][i][idx] > 0) {
                        break;
                    }
                }
                
                //creating the actual data
                for(let i = firstValIdx; i < this.solves[j].length; i++) {
                    //if the time is less than prev pb, update the rolling pb
                    if(this.solves[j][i][idx] < this.solves[j][i-1][idx+1]) {
                        this.solves[j][i].push(this.solves[j][i][idx])
                        pbStats[1].push(this.solves[j][i][idx]);
                        pbStats[2].push(this.solves[j][i][0])
                        pbStats[3].push(i);
                    }
                    //otherwise, keep the current pb
                    else {
                        this.solves[j][i].push(this.solves[j][i-1][idx+1])
                    }
                }

                this.pbData[j].push(pbStats);
            }
        }
        
    }


    updatePBTable(j) {
        //console.log("Updating pb table to session " + j)
        //create the list for stats tab
        const pbStats = document.getElementById("pbStats")
        const headerRow = document.getElementById("pbStatsHeader")
        pbStats.replaceChildren();
        pbStats.appendChild(headerRow);

        for(let i = window.userData.pbData[j][0][1].length-1; i >= 0; i--) {
            let newRow = document.createElement("tr");

            //Date column
            let dateCol = document.createElement("td");
            let date = window.userData.pbData[j][0][2][i];
            let dateStr = date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear();
            dateCol.innerHTML = dateStr;

            //PB For Time column
            let date2 = new Date();
            let dateDiff = 0;
            let pbForTimeCol = document.createElement("td")
            if(i == window.userData.pbData[j][0][1].length-1) {
                dateDiff = Math.abs(date2-date);
                pbForTimeCol.innerHTML = dhm(dateDiff) + " and counting";
            }
            else {
                date2 = window.userData.pbData[j][0][2][i+1];
                dateDiff = Math.abs(date2-date)
                pbForTimeCol.innerHTML = dhm(dateDiff);
            }
            
            //Solve # column
            let solveCol = document.createElement("td")
            solveCol.innerHTML = window.userData.pbData[j][0][3][i]

            //PB for # solves column
            let solves = window.userData.pbData[j][0][3][i]
            let nextSolves = window.userData.solves[j].length;
            if(i < window.userData.pbData[j][0][1].length-1) {
                nextSolves = window.userData.pbData[j][0][3][i+1]
            }
            let solvesPassed = nextSolves-solves;
            if(i == window.userData.pbData[j][0][1].length-1) solvesPassed += " and counting"
            let pbForSolvesCol = document.createElement("td");
            pbForSolvesCol.innerHTML = solvesPassed;

            //Solve time column
            let timeCol = document.createElement("td");
            timeCol.innerHTML= round(window.userData.pbData[j][0][1][i],3)

            newRow.appendChild(timeCol);
            newRow.appendChild(dateCol);
            newRow.appendChild(pbForTimeCol);
            newRow.appendChild(solveCol);
            newRow.appendChild(pbForSolvesCol);

            pbStats.appendChild(newRow);
        }
    }
}


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


