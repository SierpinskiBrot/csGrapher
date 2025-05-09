# csGrapher
 Tool for graphing and analyzing solve data from csTimer

### How to get csTimer file
![Screenshot](/cstimer-export-help.jpg)

# Usage
## Graph tab
This tab shows a more extensive version of csTimer's graph for the selected session

Click and drag to zoom on the graph, double click to zoom out

The buttons on the left allow you to toggle which series you want to see on the graph (ex. PB Single, ao5, ao100). 

The buttons on the right are to edit the axes of the graph. You can choose whether to have the date or the solve number on the x axis, 
and can change the scale of either axis from linear to logarithmic. Note that using logarithmic on the x-axis will only works with solve number, not date

*Future updates will implement the ability to add new series and change the color of the series*

## Histogram tab
This tab shows a histogram of the solve times for the selected session

As with the graph tab, you can click and drag to zoom in on the histogram and double click to zoom out

There is an input on the left to change the column width for the histogram (default 1) and a button to reset it to default 

*Future updates will implement the ability to graph by relative frequency instead of frequency, histogram for all series (ao5,ao12,...) instead of just single, 
option to display an approximate bell curve of the histogram distribution, and a way select a range of solves (ex. last 500 solves) instead of all of them*

## Statistics Tab
This tab displays data about your pbs for the selected session

Currently displays a table of the pbs with columns for the solve time, solve date, how long it took to beat the pb, solve #, and how many solves it took to beat the pb

*Future updates will implement the ability to view pbs for all series (ao5, ao100,...) instead of just single, and tools for visualizing other statistics 
such as standard deviation, relative standard deviation, time spent, and predictions about your improvement after some amout of time/solves*
