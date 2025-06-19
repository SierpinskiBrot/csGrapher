export {makeArrayOfArrays, binarySearchInsertIdx, round, dhm, sleep, createButton, parseTime};


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