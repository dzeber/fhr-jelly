$(function() {

    var navListItems = $('.nav li'),
        rawTabs = $('#raw_selector').find('li a'),
        navItems = navListItems.find('a'),
        contentContainers = $('.mainContent'),
        rawContentContainers = $('.rawdata-display'),
        rawHeadings = $('.raw_heading');

    var showContainer = function(anchor) {
        // Get the id of the container to show from the href.
        var containerId = anchor.attr('href'),
            container = $(containerId);

        container.show();
    };

    // Handle clicks on the main presistent header
    navItems.click(function(event) {
        event.preventDefault();
        // Ensure all content containers are hidden.
        contentContainers.hide();
        // Remove the active class from all links
        navItems.removeClass('active');
        // Set the clicked links to active
        $(this).addClass('active');

        showContainer($(this));
    });

    // Handle tab clicks on the raw data view
    rawTabs.click(function(event) {
        event.preventDefault();
        // Ensure all content containers are hidden.
        rawContentContainers.hide();
        rawHeadings.hide();

        // Deactivate all tabs
        rawTabs.removeClass('active');
        // Set the clicked anchor to active
        $(this).addClass('active');

        showContainer($(this), true);
        $($(this).attr('href') + '_heading').show();
    });

    // Show and hide the statistics for viewports less than 768px
    var showStatistics = $('#showstats'),
        statsBox = $('.statsBox'),
        statsBoxSection = $('.statsBoxSection');

    showStatistics.click(function(event) {
        event.preventDefault();

        statsBox.toggleClass('show');
        statsBoxSection.toggleClass('show');
    });

    // Tip Boxes
    // Handle close button clicks on tip boxes
    $(".closeTip").mouseup(function() {
        var tipBox = $(this).parent();
        tipBox.hide("slow");
    });

    // Collapse and Expand Tip Box
    $(".tipBox-header").click(function() {
        var tipboxContent = $(this).next(".tipBox-content");

        tipboxContent.toggleClass("collapse");
        $(this).find(".expanderArrow").toggleClass("collapse");
        tipboxContent.find(".buttonRow").toggleClass("collapse");
    });

    var waitr = 0;
    // Using a self executing function with a setTimeout
    // to ensure we do not attempt to use the payload
    // before it is ready.
    (function waitForPayload() {
        if(payload) {
            showTipboxes();
            return;
        }
        waitr = setTimeout(waitForPayload, 500);
    })();

//------------------------------------------
    
/*    var drawGraph = function(median) {

        var graphData = getAllStartupTimes(median),
            options = {
                colors: ['#50B432'],
                series: {
                    points: {
                        show: true,
                        radius: 5
                    }
                },
                xaxis: {
                    mode: 'time',
                    ticks: graphData.dateCount,
                    show: true
                }
            },
            graphContainer = $('.graph'),
            graph = $.plot(graphContainer, [graphData.startupTimes], options);

        // We are drawing a graph so show the Y-label
        $('.yaxis-label').show();
    }, */
    var drawGraph = function(median) {
	    if(median) {
            drawAverageGraph();
        } else {
            drawAllGraph();
        }
    },
    
    
    drawAverageGraph = function() {
        // Minimum height of y axis: 5 seconds 
        var Y_MIN_HEIGHT = 5, 
            // Minimum number of dates on the x axis: 2 weeks 
            X_MIN_DAYS = 14, 
			// Desired number of ticks on the y axis 
			Y_NUM_TICKS = 5,
			// Minimum point radius 
			MIN_POINT_RAD = 2.5,  
			// Maximum point radius 
			MAX_POINT_RAD = 5, 
			// Proportion of space allocated to a single day that the point radius should take
			POINT_DAY_PROP = 0.5, 
			// Proportion of space allocated to a single day that the crash point radius should take
			CRASH_DAY_PROP = 0.9, 
			// Radius parameter for rounded corners for crash indicators
			CRASH_RX = 4, 
			// Max number of crashes to be registered on the colour scale 
			// Higher numbers of crashes will be capped at this 
			CRASH_NUM_CAP = 10, 
			// Range to specify for the crash colour scale
			CRASH_COL_RANGE = ["#ffc966", "#4c0000"], 
			// Height of crash indicator arrow
			CRASH_ARROW_HEIGHT = 5,
			// Width of crash indicator arrow as a proportion of crash indicator width. 
			CRASH_ARROW_WIDTH_PROP = 0.5,
			// Proportion of plot height that should be dedicated to outliers, if any. 
			OUTLIER_PLOT_PROP = 0.3;
        
    	// Sizes in px: 
			// Space to allocate for the x axis (ticks and labels)
        var xAxisPadding = 25, 
			// Padding allocated for the y axis with ticks, but excluding labels. 
            yAxisBasePadding = 10,
			yAxisPadding = yAxisBasePadding,
            // Padding to add per digit on the y-axis labels
			perDigitPadding = 7,
			// Vertical amount by which the top of the plot (and the y axis) should exceed the highest datapoint.
			plotTopPadding = 20, 
			// Padding between the left and right edges of the plot and the first and last days
            datePadding = 20, 
			// Vertical space to allocate for crash indicator
			crashHeight = 25, 
			// Vertical space to add between main plot and outlier plot, if any. 
			outlierGap = 10, 
			// Padding to add at top of entire plot - primarily to stop top axis label getting cut off. 
			topPadding = 5;
			
			
			
		// Diagnostic. 
		// var inspectData = function(dataArray) {
			// for(var i=0; i < dataArray.length; i++) { 
				// var str = "";
				// for(var k in dataArray[i]) {
					// str += k + ": " + dataArray[i][k] + ",  ";
				// }
				// console.log(str);
			// }
		// };
		
		
		//--------------------------------
		
		// Retrieve data to be plotted. 
		var graphData = getAverageGraphData();
		// Dates are interpreted as midnight GMT. Change to midnight local time for display purposes. 
		graphData.forEach(function(d) { d.date = d3.time.day(d.date); });
		
		// Remove dates with medTime undefined or null 
		// (means that there was no appSessions.previous for that day). 
		var startupData = graphData.filter(function(d) { return typeof d.medTime !== "undefined" && d.medTime !== null; });
		
		// Outlier detection. 
		// Output will be an array containing indices of elements in the original array that should be considered outliers, if any. 
		var outliers = (function(data) {
			// The number of values flagged as outliers should not be more than this proportion of the data. 
			var MAX_PROP_OUTLIERS = 0.1;
			// A value is flagged as an outlier if its gap is larger than this proportion of the maximum value. 
			var MAX_GAP_PROP = 0.7;
			// var MAX_GAP_PROP = 0.51;
			
			var i, _data = data.map(function(d) { return d.value; });
			data = data.sort(function(a,b) { return a.value - b.value; });
			
			var gaps = [];
			// Compute differences between consecutive sorted values. 
			// Index refers to lower endpoint of gap. 
			for(i=1; i < data.length; i++) {
				gaps.push(data[i].value - data[i-1].value);
			}
			
			// This will now be the index of the highest value in data currently not flagged as an outlier. 
			var upper = data.length - 1;
			// The index of the lowest point to be flagged as an outlier. 
			var cutPoint = data.length;
			// If the point at index upper is flagged as an outlier, 
			// then the point at upper - 1 (the upper-th point in the array) will become 
			// the new highest point not flagged. 
			// If the number of points below upper-1 (inclusive) is less than 1 - MAX_PROP_OUTLIERS, 
			// do not consider any further points for flagging. 
			var stoppingPoint = data.length * (1 - MAX_PROP_OUTLIERS);
			// While no outliers have yet been flagged, and we have not yet considered a large enough proportion of the values: 
			while(cutPoint >= data.length && upper > stoppingPoint) {
				// Find the largest gap among the points up to and including upper. 
				var indexOfMax = gaps.lastIndexOf(Math.max.apply(null, gaps), upper - 1);
				// If this gap is large enough, and not too much data will be flagged: 
				if(gaps[indexOfMax] > data[upper].value * MAX_GAP_PROP && indexOfMax + 1 > stoppingPoint) {
					// Flag all points above the upper endpoint of the gap (inclusive) as outliers. 
					cutPoint = indexOfMax + 1;
				} else {
					// Consider only points below the lower endpoint of the gap (inclusive). 
					upper = indexOfMax;
				}
			}
			
			var outlierIndices = [];
			for( ; cutPoint < data.length; cutPoint++) {
				outlierIndices.push(_data.indexOf(data[cutPoint].value));
			}
			
			return outlierIndices;
			
		})(startupData.map(function(d) { return { date: d.date, value: d.medTime }; }));
		
			
		// If there are outliers, isolate the outlier data. 
		var outlierData = [];
		if(outliers.length > 0) { 
			outliers.forEach(function(d) { 
				outlierData.push(startupData.splice(d, 1)[0]);
			});
		}
		
		// TODO: 
		// If outliers: plot outliers; compute plotHeight accordingly; and generate main plot (everything should scale accordingly).
		// Otherwise, compute plotHeight to fill entire space and generate main plot. 
		
		
		//--------------------------------
		
		
		// Dimensions are determined by container. 
        var graphContainer = d3.select(".graph"), 
            containerWidth = parseInt(graphContainer.style("width"), 10),
            containerHeight = parseInt(graphContainer.style("height"), 10), 
			plotHeight = containerHeight - xAxisPadding- crashHeight - topPadding;	
		
        // graphContainer.style("border", "1px solid black");
		
		var svg = graphContainer.append("svg:svg")
            .attr("width", containerWidth + "px").attr("height", containerHeight + "px"), 
			// Add group for startup plot, to include startup times plot and both axes. 
			startup = svg.append("g").attr("transform", "translate(0, " + topPadding + ")");
			
			
		//--------------------------------
			
			
		// Compute the y scale first and generate the axis. 
		// Use the sizes of the tick labels to compute the amount of padding to leave for the y axis. 
		var y = d3.scale.linear()
            // Allocate space from 0 to maximum value in dataset. 
            // If maximum value is less than Y_MIN_HEIGHT, extend to Y_MIN_HEIGHT. 
            .domain([0, Math.max(Y_MIN_HEIGHT, d3.max(graphData, function(d) { return d.medTime; }))])
            .range([plotHeight, plotTopPadding]); 
		// Update scale to incorporate extra space at the top. 
		y.domain([0, y.invert(0)]).range([plotHeight, 0]);
			
		var yAxis = d3.svg.axis()
            .scale(y).orient("left")
            .ticks(Y_NUM_TICKS); 
		
		startup.append("g")
            .attr("class", "y axis")
            .call(yAxis)
        
		
		// alert(yAxisPadding);
		// Get the tick labels that will be displayed on the plot. 
		var yTicks = [];
		d3.selectAll(".y.axis text").each(function(d) { yTicks.push(d); });
		// Compute y axis padding according to the maximum length of the labels. 
		// There is probably a better way to do this - depends on font size.  
		// alert(yTicks);
		yAxisPadding += perDigitPadding * d3.max(yTicks, function(d) { return d.toString().length; });
		
		// alert(yTicks.map(function(d) { return d.toString().length; }));
		// alert(d3.max(yTicks, function(d) { return d.toString().length; }));
		
		// alert(yAxisPadding);
			
		//--------------------------------
			
		
		// Add padding to left of plot. 
		startup.attr("transform", "translate(" + yAxisPadding + ", " + topPadding + ")");
        
		var plotWidth = containerWidth - yAxisPadding;
		
		
        // startup.append("rect").style("stroke","blue")
            // .attr("width",width-yAxisPadding).attr("height",height-xAxisPadding);
 
		// Add background colour. 
		startup.append("rect").attr("id", "startup")
			.attr("width", plotWidth).attr("height", plotHeight);
		
		// Set up scale for dates on x-axis. 
		// If earliest date is less than two weeks ago, set to two weeks ago.
		var earliest = new Date(Math.min(d3.time.day(d3.time.day.offset(new Date(), -X_MIN_DAYS)), d3.min(graphData, function(d) { return d.date; })));
		var x = d3.time.scale()
            // Allocate space from earliest date in the payload until today.
            .domain([earliest, d3.time.day(new Date())])
            .range([datePadding, plotWidth - datePadding]);
		// Update scale to add padding on the left and right. 
		x.domain([x.invert(0), x.invert(plotWidth)]).range([0, plotWidth]);
        
		// Add axes. 
		// Main x-axis with ticks labelled according to prettiness. 
        var xAxis = d3.svg.axis()
            .scale(x).orient("bottom")
			.tickFormat(d3.time.format("%b %d"));
			
		
		// Secondary x-axis to show unlabelled ticks for each day. 
		// var xAxisSub = d3.svg.axis()
            // .scale(x).orient("bottom")
			// .ticks(d3.time.days)
			// .tickFormat("");
            
     
        startup.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + plotHeight + ")")
            .call(xAxis)
			// .append("g").call(xAxisSub);
            
		// Remove and readd y axis so that it will be drawn on top of the background rect. 
		startup.select(".y.axis").remove();
		startup.append("g")
            .attr("class", "y axis")
            .call(yAxis)
		
			
		//--------------------------------
			
		
        // Add points. 
		
		// Scale the point radius according to the horizontal space allocated per day. 
		var pointRadius = Math.min(Math.max(
			(x(d3.time.day.offset(earliest, 1)) - x(earliest)) * POINT_DAY_PROP, 
			MIN_POINT_RAD), MAX_POINT_RAD); 
				
		startup.selectAll("circle")
            .data(startupData).enter().append("circle")
            .attr("class", "startup-point")
            .attr("r", pointRadius)
            .attr("cx", function(d) { return x(d.date); })
            .attr("cy", function(d) { return y(d.medTime); })
        
			
		//--------------------------------
			
		// Add crash indicators. 		
		
		// Group for crash indicators below x axis. 
		var crashes = svg.append("g").attr("transform", 
			"translate(" + yAxisPadding + "," + (containerHeight - crashHeight) + ")");
		
		// Only retain dates with positive crash count. 
		var crashData = graphData.filter(function(d) { return d.crashCount > 0; });
		
		// Scale the point width according to the horizontal space allocated per day. 
		var pointWidth = Math.min((x(d3.time.day.offset(earliest, 1)) - x(earliest)) * CRASH_DAY_PROP, crashHeight - CRASH_ARROW_HEIGHT);
		// Width of the base of the arrow. 
		var arrowWidth = pointWidth * CRASH_ARROW_WIDTH_PROP;
				
		// Set up colour scale for crashes. 
		var crashScale = d3.scale.linear()
			// Cap maximum number of crashes to register on the scale. 
			.domain([1, CRASH_NUM_CAP])
			.range(CRASH_COL_RANGE);
		
		// Add crash indicators. 
		crashes.selectAll("rect")
			.data(crashData).enter() 
			.append("rect")
			// .attr("class", "crash-point")
			.attr("x", function(d) { return x(d.date) - pointWidth/2; })
			.attr("y", CRASH_ARROW_HEIGHT)
			.attr("width", pointWidth).attr("height", crashHeight - CRASH_ARROW_HEIGHT)
			.attr("rx", CRASH_RX)
			.style("fill", function(d) { 
				return crashScale(d.crashCount > CRASH_NUM_CAP ? CRASH_NUM_CAP : d.crashCount); 
			});
		
		// Add arrows pointing to x-axis. 
		crashes.selectAll("polygon")
			.data(crashData).enter() 
			.append("polygon")
			// .attr("class", "crash-point")
			.attr("points", function(d) { 
				return (x(d.date) - arrowWidth / 2) + "," + CRASH_ARROW_HEIGHT + " " + 
					(x(d.date) + arrowWidth / 2) + "," + CRASH_ARROW_HEIGHT + " " + 
					x(d.date) + ",0";
			})
			.style("fill", function(d) { 
				return crashScale(d.crashCount > CRASH_NUM_CAP ? CRASH_NUM_CAP : d.crashCount); 
			});
			
			
    },
    
    
    drawAllGraph = function() {
    
    };
   

    
/*   drawGraph = function(median) {
        var graphData = getStartupTimeInfo();
        var margin = {top: 20, right: 20, bottom: 30, left: 50};
        var width = 700 - margin.left - margin.right;
        // d3.select('.graph').style('height')
        var height = 292 - margin.top - margin.bottom;
        var x = d3.time.scale() .range([0+5, width-5]);
        var y = d3.scale.linear() .range([height-10, 0+10]);        
        var xAxis = d3.svg.axis() .scale(x) .orient("bottom").tickFormat(d3.time.format("%d-%b")).ticks(5);;
        var yAxis = d3.svg.axis() .scale(y) .orient("left");
            // .tickFormat(d3.time.format("%d/%b"));
        var line = d3.svg.line()
            .x(function(d) { return x(d.date); })
            .y(function(d) { return y(d.avgTime); });
        d3.select(".graph").style("background-color", "white");
        var svg = d3.select(".graph").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
        
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        x.domain(d3.extent(graphData, function(d) { return d.date; }));
        y.domain(d3.extent(graphData, function(d) { return d.avgTime; }));
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);
        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);
        svg.append("path")
            .datum(graphData)
            .attr("class", "line")
            .attr("d", line);
    };
*/

//------------------------------------------
    
    clearSelectors = function(selector) {
        var graphSelectors = $(selector).find('li a');

        graphSelectors.each(function() {
            $(this).removeClass('active');
        });
    };
    
    
    $('#graph_all').click(function(event) {
        event.preventDefault();
        // Clear all currently active selectors
        clearSelectors('#graph_selector');

        // Set this selector to active
        $(this).addClass('active');
        drawGraph(false);
    });

    $('#graph_median').click(function(event) {
        event.preventDefault();
        // Clear all currently active selectors
        clearSelectors('#graph_selector');

        // Set this selector to active
        $(this).addClass('active');
        drawGraph(true);
    });

    // Conditionally show tip boxes
    function showTipboxes() {
        clearTimeout(waitr);

        // User has a crashy browser
        if(getTotalNumberOfCrashes('week') > 5) {
            $('#crashyfox').show('slow');
        }

        // We need at least 5 sessions with data
        if(getSessionsCount() < 5) {
            $('#hungryfox').show('slow');
        } else {
            // We have enough data, show the graph UI
            // and draw the graph. By default, we draw
            // the average startup times.
            $('.graphbox').show();
            drawGraph(true);
        }

        // If our median startup time is greater than 20,
        // we have a slowfox
        if(calculateMedianStartupTime() > 20) {
            $('#slowfox').show('slow');
        }
    }
});
