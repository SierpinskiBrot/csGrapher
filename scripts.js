import "./lib/dygraph.js";

//              x,     y
var logScale = [false, false]

var userData = null;
window.selectedSess = 0; //selected session from the cstimer

//handle the toolbar buttons on the top
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
})
histogramButton.addEventListener("click", function() {
    resetContainers();
    histogramContainer.style.display = "flex";
    histogramButton.classList.add("pressed");
})
statsButton.addEventListener("click", function() {
    resetContainers();
    statsContainer.style.display = "flex";
    statsButton.classList.add("pressed");
})



//This code is run after the user uploads a file
const jsonDataFile = document.getElementById("UploadFile");
jsonDataFile.addEventListener("change", function() {

    var GetFile = new FileReader;
    GetFile .onload=function(){
        const result = GetFile.result;
        console.log(result);
        var jsonData = JSON.parse(result);

        //parse the data into better arrays
        window.userData = new UserData(jsonData)

        //Create the dropdown for the title of the graph and set its functionality
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
        window.dropdown.setAttribute("onchange", 'window.updateGraph(); window.g.resetZoom()');
        document.getElementById("header").appendChild(window.dropdown)



        //Create the graph
        Dygraph.onDOMready(function onDOMready() {
            window.g = new Dygraph(
            
                // containing div
                document.getElementById("graphdiv"),
            
                //Data
                window.userData.solves[window.selectedSess],

                //Options
                {
                labels: window.userData.labels,
                xlabel: window.userData.xTitle,
                ylabel: "Time(s)",
                legend: "always",
                //title: window.dropdown.outerHTML,
                color: "#084C61",
                labelsDiv: document.getElementById("legendLine"),
                labelsSeparateLines: false,
                zoomCallback: function() { //Make sure the title of dropdown stays the same while zooming
                    window.dropdown = window.document.getElementById("title-dropdown");
                    console.log("zoomCallback:")
                    console.log("   dropdown: " + window.dropdown.value + ", selected: " + window.selectedSess)
                    window.dropdown.value = window.selectedSess;
                    console.log("   new dropdown: " + window.dropdown.value)
                }
                }
            );
            });
        
        //Line styling for each line
        for(let i = 1; i < window.userData.labels.length; i++) {
            let label_ = window.userData.labels[i]
            let color_ = window.userData.colors[i-1]
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
                    pointSize: 1}}})
            }
        }
       //create the series toggle buttons
       document.getElementById("graphLeftButtons").replaceChildren(); //delete any existing buttons on the left
       let leftButtonsTitle = document.createElement("div");
       let leftButtonsTitleText = document.createElement("p");
       leftButtonsTitleText.innerHTML = "Series:"
       leftButtonsTitle.appendChild(leftButtonsTitleText)
       leftButtonsTitle.classList.add("buttonsTitle")
       document.getElementById("graphLeftButtons").appendChild(leftButtonsTitle);
       for(let i = 1; i < window.userData.labels.length; i++) {
            //create the button
            let newButton = document.createElement("button");
            newButton.setAttribute("type","button");
            let newLabel = document.createElement("label");
            newLabel.innerHTML = window.userData.labels[i];
            newButton.appendChild(newLabel);
            let color_ = window.userData.colors[i-1];
            newButton.style = "background:" + color_ + "; border-color: " + color_

            //redundant as visibility is reset when a file is uploaded
            if(!window.userData.visibilities[i-1]) newButton.classList.toggle('pressed')

            //create the onclick functino
            newButton.addEventListener("click", (e) => {
                let currentVisibility = window.userData.visibilities[i-1];
                console.log("Button: " + i-1 + ", current: " + currentVisibility)
                window.userData.visibilities[i-1] = !currentVisibility;
                window.g.setVisibility(window.userData.visibilities, true);
                const tgt = e.target.closest('button');
                tgt.classList.toggle('pressed');
            })
            
            //line breaks after buttons that say pb
            document.getElementById("graphLeftButtons").appendChild(newButton);
            if(window.userData.labels[i][0] == 'P') {
                document.getElementById("graphLeftButtons").appendChild(document.createElement("br"));                
            }
        }

        //create the list for stats tab
        let pbStats = document.getElementById("pbStats")
        for(let i = window.userData.pbData[0][0][1].length-1; i >= 0; i--) {
            let newRow = document.createElement("tr");

            let dateCol = document.createElement("td");
            let date = window.userData.pbData[0][0][2][i];
            let dateStr = date.getDate() + " " + date.getMonth() + " " + date.getFullYear();
            dateCol.innerHTML = dateStr;

            let solveCol = document.createElement("td")
            solveCol.innerHTML = window.userData.pbData[0][0][3][i]

            let timeCol = document.createElement("td");
            timeCol.innerHTML= window.userData.pbData[0][0][1][i]

            newRow.appendChild(dateCol);
            newRow.appendChild(solveCol);
            newRow.appendChild(timeCol);
            pbStats.appendChild(newRow);
        }

    }

    GetFile.readAsText(this.files[0]);
});


//Handle swapping between Date and Solve# on the x-axis
function xSwapData() {
    if(window.userData != undefined && window.g != undefined) {
        [window.userData.solves, window.userData.solves2] = [window.userData.solves2, window.userData.solves];
        [window.userData.xTitle, window.userData.xTitle2] = [window.userData.xTitle2, window.userData.xTitle];
        window.updateGraph();
        window.g.resetZoom();
    }
};
const xSelectDate = document.getElementById("xSelectDate");
xSelectDate.addEventListener("click", function() { if(window.userData.xTitle != "Date") xSwapData(); });
const xSelectSolve = document.getElementById("xSelectSolve");
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
const xSelectLinear = document.getElementById("xSelectLinear");
xSelectLinear.addEventListener("click", function() { if(logScale[0] == true) xSwapScale(); });
const xSelectLog = document.getElementById("xSelectLog");
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
const ySelectLinear = document.getElementById("ySelectLinear");
ySelectLinear.addEventListener("click", function() { if(logScale[1] == true) ySwapScale(); });
const ySelectLog = document.getElementById("ySelectLog");
ySelectLog.addEventListener("click", function() { if(logScale[1] == false) ySwapScale(); });


//Update the graph
window.updateGraph = function() {
    window.dropdown = window.document.getElementById("title-dropdown");
    window.selectedSess = window.dropdown.value; 
    window.g.updateOptions({
        file: window.userData.solves[window.selectedSess], 
        xlabel: (logScale[0] ? "Log(": "") + window.userData.xTitle + (logScale[0] ? ")": ""),
        ylabel: (logScale[1] ? "Log(": "") + "Time(s)" + (logScale[1] ? ")": "")});
    window.dropdown = window.document.getElementById("title-dropdown");
    window.dropdown.value = window.selectedSess;
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
         *                      "1": 
         *                          {
         *                              "name": name of session 1,
         *                              "opt": options like the scramble type,
         *                              "rank": idk
         *                              "stat": [#of solves, #of dnfs, mean time(ms)],
         *                              "date": [solve1 UTC, most recent solve UTC]
         *                          },
         *                      "same shit for the other sessions...": 
         *                          {
         *                              "...": ...
         *                          }
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

        //names of sessions
        this.sessions = [];

        //pb data for stats panel
        //  pbData[session][series] [0]: title, 
        //                          [1]: time(s), 
        //                          [2]: solves since last, 
        //                          [3]: days since last,
        //                          [4]: date 
        this.pbData = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];

        //Add the columns for solve date/time
        for (let s = 1; s <= 15; s++) {
            console.log("S: " + s);
            const sessionKey = `session${s}`;
            console.log("   sessionKey: " + sessionKey);
            if (data[sessionKey] !== undefined) {
                console.log("       Wohoo");
                for (let i = 0; i < data[sessionKey].length; i++) {
                    //Append col for the solve dates
                    this.solves[s - 1].push([new Date(1000 * data[sessionKey][i][3])]);

                    //Append col for the solve times
                    console.log("S: " + s + ", i: " + i)
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
    
    }

    //append a column for the average of the x last solves
    pushAvg(x) {
        console.log("pushing average of " + x);
        for (let j = 0; j < 15; j++) {
          const solves = this.solves[j];
          const clip = Math.ceil(0.05 * x);
          let windo = [];
      
          for (let i = 0; i < solves.length; i++) {
            if (i < x - 1) {
              solves[i].push(NaN);
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
                console.log("   session:" + j)

                let pbStats = [[],[],[],[]];
                pbStats[0] = x;    
                
                //index of the last col in session
                var idx = this.solves[j][this.solves[j].length-1].length - 1;

                //find the first valid index - 
                //for a pb ao12, this would be 12
                var firstValIdx = 0
                for(let i = 0; i < this.solves[j].length; i++) {
                    firstValIdx += 1;
                    this.solves[j][i].push(this.solves[j][i][idx])
                    if(this.solves[j][i][idx] > 0) {
                        console.log("       First valid index:" + firstValIdx)
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
}





