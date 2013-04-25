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


    // Generate the plots. 
    var FHRPlot = (function() {
    
        // ****************************
        // Diagnostic. 
        var inspectData = function(dataArray) {
            for(var i=0; i < dataArray.length; i++) { 
                var str = "";
                for(var k in dataArray[i]) {
                    str += k + ": " + dataArray[i][k] + ",  ";
                }
                console.log(str);
                str = "";
                for(var k in dataArray[i].updates) {
                    str += k + ": " + dataArray[i].updates[k] + ",  ";
                }
                console.log(str);
            }
        };
        // ****************************
       
       
        var graphContainer = d3.select(".graph"),
        
            // Sizing parameters: 
            
            // Dimensions of the outer container
            containerWidth = parseInt(graphContainer.style("width"), 10),
            containerHeight = parseInt(graphContainer.style("height"), 10),
            
            // Padding to add at top of entire plot - primarily to stop top axis label getting cut off. 
            topPadding = 5,
            // Vertical space for the x axis (ticks and labels)
            xAxisHeight = 35, 
            // Vertical space to allocate for crash indicator
            crashHeight = 20, 
            // Vertical space to add between main plot and outlier plot, if any. 
            outlierGap = 15, 
            
            // Vertical amount by which the top of the plot (and the y axis) should exceed the highest datapoint.
            mainPlotTopPadding = 20, 
            // Vertical amount by which the top and bottom of the outlier plot (and the y axis) 
            // should exceed the highest and lowest datapoints respectively.
            outlierPlotPadding = 15, 
            // Padding between the left and right edges of the plot and the first and last days
            leftRightPadding = 20; 
            // Padding allocated for the y axis with ticks, but excluding labels. 
            // yAxisBasePadding = 10,
            // yAxisPadding = yAxisBasePadding,
            // Horizontal padding to allocate for the y axis (computed based on tick labels). 
            // yAxisPadding = 0;
            // Padding to add per digit on the y-axis labels
            // perDigitPadding = 7,
            
        // Plot sizing variables to be set dynamically. 
            
            // The height of the main startup times plot area, excluding axes and the outlier plot, if any. 
        var mainPlotHeight,
            // The height of the outlier plot area. 
            outlierPlotHeight, 
            // The amount by which the main plot should be shifted downwards within the overall plot area. 
            // Non-zero if outlier plot is present. 
            mainPlotOffset, 
            // Width of the plot area. 
            plotWidth;
            
                
            // alert(mainPlotHeight);
             
            
        // Remove the old plot and create a fresh outer svg container. 
        // Returns a group within the svg, shifted downwards according to topPadding. 
        var newPlot = function() {
            graphContainer.select("#svgplot").remove();
            
            // Reset sizing. 
            mainPlotHeight = containerHeight - topPadding - xAxisHeight, 
            outlierPlotHeight = 0, 
            mainPlotOffset = 0, 
            plotWidth = containerWidth;
            
            // alert(mainPlotHeight);
            // Set y axis label position relative to the height of the plot. 
            d3.select("#yaxis-label").style("top", Math.round(mainPlotHeight / 2) + "px");
           
            return graphContainer.append("svg:svg").attr("id", "svgplot")
                .attr("width", containerWidth + "px")
                .attr("height", containerHeight + "px");
                // .append("g").attr("transform", "translate(0, " + topPadding + ")");
        }, 
    
        
        // Prepares the plot startup plot area. 
        // Computes the necessary y axis padding, and adds axes, gridlines and background. 
        // Pass in the plot container, y axis function, and outlier y axis function if available. 
        // Returns object with pointers to the translated inner container selection, the main plot area selection, 
        // and the outlier plot area selection, if available. 
        setUpPlotArea = function(container, yAxis, yAxisOutlier) {
            
            var innerContainer = container.append("g"), 
                axisElement, 
                mainPlotArea, 
                outlierPlotArea; 
                
            var yAxisPadding = 0;
            
            // Add the y axes to the plot and record the amount of horizontal space they occupy. 
            if(typeof yAxisOutlier !== "undefined") {
                // First handle outlier plot. 
                axisElement = innerContainer.append("g").attr("class", "y axis").call(yAxisOutlier);
                yAxisPadding = Math.max(yAxisPadding, axisElement[0][0].getBBox().width);
            }
            
            // Draw the y axis. 
            axisElement = innerContainer.append("g").attr("transform", "translate(0," + mainPlotOffset + ")")
                .attr("class", "y axis").call(yAxis);
            // Compute padding according to actual space taken by y axis including ticks and labels. 
            yAxisPadding = Math.max(yAxisPadding, axisElement[0][0].getBBox().width);
            
            // Padding for y axis has now been determined. Make corresponding adjustments. 
            innerContainer.attr("transform", "translate(" + yAxisPadding + ", " + topPadding + ")");
            plotWidth -= yAxisPadding;
            
            // Add group for main plot area. 
            mainPlotArea = innerContainer.insert("g", ":first-child")
                .attr("transform", "translate(" + 0 + ", " + mainPlotOffset + ")"); 
                
            // Add background colour.  
            mainPlotArea.append("rect").attr("class", "plot-background")
                .attr("width", plotWidth).attr("height", mainPlotHeight);
            
            // Add gridlines as a separate axis. 
            // var yGrid = d3.svg.axis().scale(y).orient("left")
                // .ticks(Y_NUM_TICKS).tickSize(-plotWidth);
            mainPlotArea.append("g").attr("class", "gridlines")
                .call(yAxis.tickSize(-plotWidth));
            
                        
            // If have separate outlier plot, follow same steps to create subplot area. 
            if(typeof yAxisOutlier !== "undefined") {
                outlierPlotArea = innerContainer.insert("g", ":first-child");
                
                // Add background and gridlines. 
                outlierPlotArea.append("rect").attr("class", "plot-background")
                    .attr("width", plotWidth).attr("height", outlierPlotHeight);
                // yGrid = d3.svg.axis().scale(yOut).orient("left").tickSize(-plotWidth); 
                // var yAxisOutTickValues = yAxisOutlier.tickValues(); 
                // // Use specified tick values, if any. 
                // if(yAxisOutTickValues == null) {
                    // yGrid.ticks(Y_NUM_TICKS_OUT);
                // } else {
                    // yGrid.tickValues(yAxisOutTickValues);
                // }
                outlierPlotArea.append("g").attr("class", "gridlines")
                    .call(yAxisOutlier.tickSize(-plotWidth));
            
                // Add dotted boundary separators. 
                outlierPlotArea.append("line").attr("x1", 0).attr("y1", outlierPlotHeight)
                    .attr("x2", plotWidth).attr("y2", outlierPlotHeight)
                    .attr("class", "boundary");
                mainPlotArea.append("line").attr("x1", 0).attr("y1", 0)
                    .attr("x2", plotWidth).attr("y2", 0)
                    .attr("class", "boundary");
            }
            
            return {
                container: innerContainer,
                main: mainPlotArea, 
                outlier: outlierPlotArea
            };
            
        }, 
        
        // Input should be data in the form of an array of objects, 
        // along with the key used to identify the values. 
        // Outputs an array of indices of the elements in the input data array 
        // that should be considered outliers, if any. 
        detectOutliers = function(data, valueKey) { 
            // The number of values flagged as outliers should not exceed this proportion of the data. 
            var MAX_PROP_OUTLIERS = 0.1,
                // A value is flagged as an outlier if its distance from the next largest value 
                // is larger than this proportion of the maximum value. 
                MAX_GAP_PROP = 0.7;
                // MAX_GAP_PROP = 0.51;
                
            // var originalData = data.map(function(d) { return d[valueKey]; });  
            // Create a reduced copy of the dataset to work with. 
            var vals = data.map(function(d, i, arr) { 
                    return {
                        index: i,
                        value: d[valueKey]
                    }; 
                }), 
                n = vals.length;
            
            vals.sort(function(a,b) { return a.value - b.value; });
            
            // Compute the distances between consecutive sorted data values. 
            var gaps = [];
            // gaps array will have length n-1. 
            vals.reduce(function(prev, curr, i, arr) { 
                gaps.push(curr.value - prev.value);
                return curr;
            });
            
            // Loosely speaking, if there is a large gap between consecutive sorted values, 
            // flag points on the upper end of the gap as outliers, 
            // provided there are not too many of them. 
            
            // The index of the lowest point in the sorted data to be flagged as an outlier. 
            var cutPoint = n, 
                // The index of the highest value in the sorted data currently not flagged as an outlier. 
                // If the point at index upper is flagged as an outlier, 
                // then the point at upper - 1 (the upper-th point in the array) will become 
                // the new highest point not flagged. 
                upper = n - 1,
                // If the proportion of points to remain on the main plot is less than 1 - MAX_PROP_OUTLIERS, 
                // do not consider any further points for flagging. 
                stoppingPoint = n * (1 - MAX_PROP_OUTLIERS),
                maxGap, 
                // The index in the sorted data of the upper endpoint of the largest gap. 
                indexOfMax;
                
            // While no outliers have yet been flagged, and we have not yet considered a large enough proportion of the values: 
            while(cutPoint >= n && upper > stoppingPoint) {
                // Find the largest gap among the points up to and including upper. 
                // This means searching elements 0 to upper-1 of gaps. 
                maxGap = d3.max(gaps, function(v, i) {
                    if(i < upper) {
                        return v;
                    }
                    return -1;
                }); 
                indexOfMax = gaps.lastIndexOf(maxGap, upper - 1) + 1;
                // If this gap is large enough, and not too much data will be flagged: 
                if(maxGap > vals[upper].value * MAX_GAP_PROP && indexOfMax > stoppingPoint) {
                    // Flag all points above the upper endpoint of the gap (inclusive) as outliers. 
                    cutPoint = indexOfMax;
                } else {
                    // Consider only points below the lower endpoint of the gap (inclusive). 
                    upper = indexOfMax - 1;
                }
            }
            
            // Record original data indices of points falling above the cutpoint. 
            var outlierIndices = [];
            for( ; cutPoint < n; cutPoint++) {
                outlierIndices.push(vals[cutPoint].index);
            }
            
            return outlierIndices;
        
        };
    
                   
        
      
        
        // Load the relevant data and display the Average plot. 
        // Data and computed values are not cached - 
        // data should refresh on each load. 
        function drawAveragePlot() {
        
            // Minimum height of y axis: 5 seconds 
            var Y_MIN_HEIGHT = 5, 
                // Minimum number of dates on the x axis = 2 weeks 
                X_MIN_DAYS = 14, 
                // Desired number of ticks on the y axis 
                Y_NUM_TICKS = 5,
                // Desired number of ticks on the y axis for outliers
                Y_NUM_TICKS_OUT = 2,
                // Padding to use to offset month labels
                MONTH_TICK_PADDING = 15,
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
                OUTLIER_PLOT_PROP = 0.25;
                // Width of domain to use for outlier plots with a single point (in seconds). 
                // OUTLIER_DOMAIN_WIDTH = 3;
               
            
             // Initialize a new plot container. 
            var svg = newPlot();
            
            // Adjust space to accomodate crash indicator. 
            mainPlotHeight -= crashHeight;
            
            
            // graphContainer.style("border", "1px black solid");
            
            // Total amount of space allocated to the plot area, 
            // including outlier plot, if any, and x-axis.
            // var totalPlotHeight = containerHeight 
                // // - xAxisPadding 
                // - crashHeight - topPadding, 
            // The amount by which elements of the main plot should be shifted downwards 
            // within the overall plot group. 
            // (only non-zero if outlier plot is present). 
            // var mainPlotOffset = 0; 
            // The heights of the individual plots, excluding axes. 
            // outlierPlotHeight = 0;
            // mainPlotHeight = totalPlotHeight - xAxisPadding;
            
            
            // Load data. 
            var graphData = getGraphData(true);
                    
            // Dates are interpreted as midnight GMT. Change to midnight local time for display purposes. 
            graphData.forEach(function(d) { d.date = d3.time.day(d.date); });
            
            
            //----------------------------
            
            // Process data for startup times. 
            
            // Remove dates with medTime undefined or null (means that there was no sessions startups for that day). 
            var startupData = graphData.filter(function(d) { 
                // return typeof d.medTime !== "undefined" && d.medTime !== null; 
                return d.medTime != null; 
            });
            
            
            // Outlier detection. 
            var outliers = detectOutliers(startupData, "medTime");
            
                
            // If there are outliers, isolate the outlier data. 
            var outlierData = [];
            
            if(outliers.length > 0) { 
                outliers.forEach(function(d) { 
                    outlierData.push(startupData.splice(d, 1)[0]);
                });
                
                // Adjust sizing variables. 
                outlierPlotHeight = mainPlotHeight * OUTLIER_PLOT_PROP;
                mainPlotOffset = outlierPlotHeight + outlierGap;
                mainPlotHeight -= mainPlotOffset;
            }
            
            
           
            //--------------------------------
            
            
            // Create y axis scales and axes. 
            var x, xAxis, y, yAxis, yOut, yAxisOut;
            
            y = d3.scale.linear()
                // Allocate space from 0 to maximum value in dataset. 
                // If maximum value is less than Y_MIN_HEIGHT, extend to Y_MIN_HEIGHT. 
                .domain([0, Math.max(Y_MIN_HEIGHT, d3.max(startupData, function(d) { return d.medTime; }))])
                .range([mainPlotHeight, mainPlotTopPadding]); 
            // Update scale to incorporate extra space at the top. 
            y.domain([0, y.invert(0)]).range([mainPlotHeight, 0]);
            
            yAxis = d3.svg.axis().scale(y).orient("left").ticks(Y_NUM_TICKS); 
            
            
            if(outlierData.length > 0) {
                yOut = d3.scale.linear()
                    // Domain should incorporate outlier values. 
                    // If only a single outlier, pad domain. 
                    .domain(outlierData.length > 1 ? d3.extent(outlierData, function(d) { return d.medTime; }) : 
                        [ Math.floor(outlierData[0].medTime), Math.ceil(outlierData[0].medTime) ]
                    )
                    .range([outlierPlotHeight - outlierPlotPadding, outlierPlotPadding]); 
                    // Update scale to incorporate extra space at the top. 
                yOut.domain([yOut.invert(outlierPlotHeight), yOut.invert(0)])
                    .range([outlierPlotHeight, 0]);
                    
                yAxisOut = d3.svg.axis().scale(yOut).orient("left");
                if(outlierData.length == 1) { 
                    yAxisOut.tickValues([ Math.floor(outlierData[0].medTime), Math.ceil(outlierData[0].medTime) ])
                        .tickFormat(d3.format(".0f"));
                } else { 
                    yAxisOut.ticks(Y_NUM_TICKS_OUT);
                }
                
            }
            
            
            //--------------------------------
            
            
            // Set up plotting area. 
            
            // Render y axes to compute necessary padding, and set up background features. 
            var plot = setUpPlotArea(svg, yAxis, yAxisOut);
            
            
           
            // Collect bounding boxes of the y axes to calculate y axis padding. 
            // var bb = [];
            
                // TOOD:  Necessary?
                 // Add group for startup plot, to include startup times plot, outlier plot if required, and all axes. 
            // var startup = svg;
                // svg.append("g");
                // svg.append("g").attr("transform", "translate(0, " + topPadding + ")");
                
            // If have outliers, allocate space for extra plot. 
            // if(outlierData.length > 0) {
                // outlierPlotHeight = mainPlotHeight * OUTLIER_PLOT_PROP;
                // mainPlotOffset = outlierPlotHeight + outlierGap;
                // mainPlotHeight -= mainPlotOffset;
                
                // // Compute y scale and axis to be able to get sizing. 
                // var yOut = d3.scale.linear()
                    // // Domain should incorporate outlier values. 
                    // // If only a single outlier, pad domain. 
                    // .domain(outlierData.length > 1 ? d3.extent(outlierData, function(d) { return d.medTime; }) : 
                        // [ Math.floor(outlierData[0].medTime), Math.ceil(outlierData[0].medTime) ]
                    // )
                    // .range([outlierPlotHeight - outlierPlotPadding, outlierPlotPadding]); 
                    // // Update scale to incorporate extra space at the top. 
                    // yOut.domain([yOut.invert(outlierPlotHeight), yOut.invert(0)]).range([outlierPlotHeight, 0]);
                
                // var yAxisOut = d3.svg.axis()
                    // .scale(yOut).orient("left");
                // if(outlierData.length == 1) { 
                    // yAxisOut.tickValues([ Math.floor(outlierData[0].medTime), Math.ceil(outlierData[0].medTime) ])
                        // .tickFormat(d3.format(".0f"));
                // } else { 
                    // yAxisOut.ticks(Y_NUM_TICKS_OUT);
                // }
                
                // var yaOut = startup.append("g")
                    // // No offset
                    // .attr("class", "y axis")
                    // .attr("id", "y-axis-out")
                    // // .style("visibility", "hidden")
                    // .call(yAxisOut)
                
                // bb.push(document.getElementById("y-axis-out").getBBox());
            // }
            
                
            
            
                
                
            //--------------------------------
                
                
            // Compute the y scale first and generate the axis. 
            // Use the sizes of the tick labels to compute the amount of padding to leave for the y axis. 
            // var y = d3.scale.linear()
                // // Allocate space from 0 to maximum value in dataset. 
                // // If maximum value is less than Y_MIN_HEIGHT, extend to Y_MIN_HEIGHT. 
                // .domain([0, Math.max(Y_MIN_HEIGHT, d3.max(startupData, function(d) { return d.medTime; }))])
                // .range([mainPlotHeight, mainPlotTopPadding]); 
            // // Update scale to incorporate extra space at the top. 
            // y.domain([0, y.invert(0)]).range([mainPlotHeight, 0]);
                
            // var yAxis = d3.svg.axis()
                // .scale(y).orient("left")
                // .ticks(Y_NUM_TICKS); 
            
            // var ya = startup.append("g")
                // .attr("transform", "translate(0," + mainPlotOffset + ")")
                // .attr("class", "y axis")
                // .attr("id", "y-axis")
                // // .style("visibility", "hidden")
                // .call(yAxis)
                
            // alert(ya[0][0].getBBox().width);
            // var plotArea = setUpPlotArea(svg, yAxis);
            
                
            // bb.push(document.getElementById("y-axis").getBBox());    
            // alert(d3.max(bb, function(d) { return d.width; }));
            
            // Padding should be the maximum width required by the computed y axis bounding boxes. 
            // Need computed axis so that ticks are chosen and labelled. 
            // yAxisPadding = d3.max(bb, function(d) { return d.width; });
            
    
            // Remove y axes (re-add later so that it will be drawn on top of the background rect). 
            // var sy = startup.selectAll(".y.axis");
            
            // sy.remove();
            
                
            //--------------------------------
                
            
            // Add padding to left of plot. 
            // startup.attr("transform", "translate(" + yAxisPadding + ", " + topPadding + ")");
            
            // var plotWidth = containerWidth - yAxisPadding;
            // var plotWidth = containerWidth;
            
            // startup.append("rect").style("stroke","blue")
                // .attr("width",width-yAxisPadding).attr("height",height-xAxisPadding);
                
            // Add main plot features to separate group if necessary to handle offsetting. 
            // var mainPlot = outlierData.length === 0 ? startup : 
                // startup.append("g").attr("transform", "translate(0," + mainPlotOffset + ")");
     
            // Add background colour.  
            // mainPlot.append("rect").attr("class", "startup")
                // .attr("y", mainPlotOffset)
                // .attr("width", plotWidth).attr("height", mainPlotHeight);
                // .attr("width", "100%").attr("height", "100%");
     
     
            // if(outlierData.length > 0) {
                // startup.append("rect").attr("class", "startup")
                    // .attr("width", plotWidth).attr("height", outlierPlotHeight);
                    
                // // Add gridlines as separate axis. 
                // var yGridOut = d3.svg.axis().scale(yOut).orient("left").tickSize(-plotWidth); 
                // var yAxisOutTickValues = yAxisOut.tickValues(); 
                // if(yAxisOutTickValues == null) {
                    // yGridOut.ticks(Y_NUM_TICKS_OUT);
                // } else {
                    // yGridOut.tickValues(yAxisOutTickValues);
                // }

                // // Add axes to plot. 
                // startup.append("g").attr("class", "gridlines").call(yGridOut);
                // startup.append("g").attr("class", "y axis").call(yAxisOut);
                
                    
                // // startup.append("g")
                    // // .attr("class", "y axis")
                    // // .call(yAxisOut);
                    
                // // Add dotted lines along edges of gap between plots.     
                // startup.append("polyline")
                    // .attr("points", "0," + outlierPlotHeight + " " + plotWidth + "," + outlierPlotHeight)
                    // .attr("class", "boundary");
                
                // mainPlot.append("polyline")
                    // .attr("points", "0,0 " + plotWidth + ",0")
                    // .attr("class", "boundary");
                
            // }
            
            
                
            
            
            // Set up scale for dates on x-axis. 
            // If earliest date is less than two weeks ago, set to two weeks ago.
            var earliest = new Date(Math.min(d3.time.day(d3.time.day.offset(new Date(), -X_MIN_DAYS)), d3.min(graphData, function(d) { return d.date; })));
            var x = d3.time.scale()
                // Allocate space from earliest date in the payload until today.
                .domain([earliest, d3.time.day(new Date())])
                .range([leftRightPadding, plotWidth - leftRightPadding]);
            // Update scale to add padding on the left and right. 
            x.domain([x.invert(0), x.invert(plotWidth)]).range([0, plotWidth]);
            
            // Add axes. 
            // Main x-axis with ticks labelled according to prettiness. 
            var xAxis = d3.svg.axis()
                .scale(x).orient("bottom")
                .tickFormat(d3.time.format("%d"));
                
            
            // Add gridlines as separate axes. 
            // var yGrid = d3.svg.axis().scale(y).orient("left")
                // .ticks(Y_NUM_TICKS).tickSize(-plotWidth); 
                // // xGrid = d3.svg.axis().scale(x).orient("bottom").tickSize(-plotWidth);
            

            // Add axes to plot. 
            // mainPlot.append("g").attr("class", "gridlines").call(yGrid);
            // mainPlot.append("g").attr("class", "y axis").call(yAxis);
            // ya.style("visibility", "visible");
            
            // Secondary x-axis to show unlabelled ticks for each day. 
            // var xAxisSub = d3.svg.axis()
                // .scale(x).orient("bottom")
                // .ticks(d3.time.days)
                // .tickFormat("");
                
         
            plot.main.append("g").attr("class", "date axis")
                .attr("transform", "translate(0," + mainPlotHeight + ")").call(xAxis);
            plot.main.append("g").attr("class", "month axis")
                .attr("transform", "translate(0," + mainPlotHeight + ")")
                .call(xAxis.ticks(d3.time.months).tickFormat(d3.time.format("%b"))
                    .tickPadding(MONTH_TICK_PADDING));
            
                // .append("g").call(xAxisSub);
               
            // mainPlot.append("g")
                // // .attr("transform", "translate(0," + mainPlotOffset + ")")
                // .attr("class", "y axis")
                // .call(yAxis)
                // // .append("g").attr("class", "gridlines")
                // // .call(yAxis);
            
            
            //--------------------------------
            
            // Only retain dates for which an update occurred. 
            var updatesData = graphData.filter(function(d) { return typeof d.updates !== "undefined"; });
            
            // TODO instead create versionUpdateData and buildUpdateData. 
            
            // Testing: 
            updatesData.push({ date: d3.time.day(new Date()), updates: { version: "testing" } });
            // alert(x.domain());
            
            // inspectData(updatesData);
                    
            var versionUpdateAxis = d3.svg.axis().scale(x).orient("bottom")
                .tickValues(updatesData.filter(
                    function(d) { return typeof d.updates.version !== "undefined"; }
                ).map(function(d) { return d.date; })).tickSize(-mainPlotHeight);
                
            plot.main.append("g").attr("class", "version-update")
                .attr("transform", "translate(0," + mainPlotHeight + ")").call(versionUpdateAxis);
            
            if(typeof plot.outlier !== "undefined") { 
                plot.outlier.append("g").attr("class", "version-update")
                .attr("transform", "translate(0," + outlierPlotHeight + ")")
                .call(versionUpdateAxis.tickSize(-outlierPlotHeight));
            }
            
            var LABEL_H_OFFSET = 5, 
                LABEL_V_OFFSET = 12;
            
            // TODO: handle labelling of adjacent lines. 
                
            // Add version labels. 
            if(typeof plot.outlier !== "undefined") {
                plot.outlier.selectAll(".version-label text")
                .data(updatesData.filter(function(d) { 
                    return typeof d.updates.version !== "undefined"; 
                })).enter().append("text")
                .attr("class", "version-label")
                .attr("x", function(d) { return x(d.date) + LABEL_H_OFFSET; })
                .attr("y", LABEL_V_OFFSET)        
                .text(function(d) { return d.updates.version; });
            } else {
                var labels = plot.main.selectAll(".version-label text").data(updatesData.filter(
                    function(d) { return typeof d.updates.version !== "undefined"; }
                )).enter().append("text")
                .attr("class", "version-label")
                .attr("x", function(d) { return x(d.date) + LABEL_H_OFFSET; })
                .attr("y", LABEL_V_OFFSET)        
                .text(function(d) { return d.updates.version; })
                // var toRotate = [];
                // labels.each(function(d, i) { 
                    // var bb = this.getBBox();
                    // if (bb.x + bb.width > plotWidth) {
                        // labels[0][i].attr("fill","red");
                    // } 
                // });
                .filter(function(d, i) { 
                    var bb = this.getBBox();
                    return bb.x + bb.width > plotWidth;
                })
                .attr("x", -LABEL_H_OFFSET)
                .attr("y", function(d) { return x(d.date) + LABEL_V_OFFSET; })
                .attr("text-anchor", "end")
                .attr("transform", "rotate(-90)");
            }
            
            // var a = d3.selectAll(".version-label");
            // a.each(function() { alert(this.getBBox().x + this.getBBox().width > plotWidth); });
            
            
            var UPDATE_TICK_OFFSET = 5, 
                UPDATE_TICK_LENGTH = 10;
            
            
            var buildUpdateAxis = d3.svg.axis().scale(x).orient("bottom")
                .tickValues(updatesData.filter(
                    function(d) { 
                        return typeof d.updates.build !== "undefined" && typeof d.updates.version === "undefined"; }
                ).map(function(d) { return d.date; }))
                .tickSize(UPDATE_TICK_LENGTH);
                
            mainPlot.append("g").attr("class", "build-update")
                .attr("transform", "translate(0," + (mainPlotHeight - UPDATE_TICK_OFFSET) + ")")
                .call(buildUpdateAxis);
            
            // if(outlierData.length > 0) { 
                // startup.append("g").attr("class", "build-update")
                // .attr("transform", "translate(0," + (outlierPlotHeight - UPDATE_TICK_OFFSET) + ")")
                // .call(buildUpdateAxis);
            // }
            
            
                
            //--------------------------------
                
            
            // Add points. 
            
            // Scale the point radius according to the horizontal space allocated per day. 
            var pointRadius = Math.min(Math.max(
                (x(d3.time.day.offset(earliest, 1)) - x(earliest)) * POINT_DAY_PROP, 
                MIN_POINT_RAD), MAX_POINT_RAD); 
                    
            if(outlierData.length > 0) {
                // for(var i=0; i<outlierData.length; i++) { 
                    // alert(outlierData[i].medTime + " : " + yOut(outlierData[i].medTime));
                // }
                // alert(yOut.domain()); 
                // alert(yOut.range()); 
                
                startup.selectAll("circle").data(outlierData).enter().append("circle")
                    .attr("class", "startup-point")
                    .attr("r", pointRadius)
                    .attr("cx", function(d) { return x(d.date); })
                    .attr("cy", function(d) { return yOut(d.medTime); })
                
            }
            // for(var i=0; i<startupData.length; i++) { 
                // alert(startupData[i].medTime + " : " + y(startupData[i].medTime));
            // }
            mainPlot
                // .append("g").attr("transform", "translate(0," + mainPlotOffset + ")")
                .selectAll("circle").data(startupData).enter().append("circle")
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
                
                
               
        }
        
        function drawAllPlot() {
        
        
        }
        
        return {
            drawAverageGraph : drawAveragePlot, 
            drawAllGraph : drawAllPlot
        };
        
    })();
    
    
    var drawGraph = function(median) {
        if(median) {
            FHRPlot.drawAverageGraph();
        } else {
            FHRPlot.drawAllGraph();
        }
    },
    
    
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
