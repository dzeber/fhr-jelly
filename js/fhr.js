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
    
        
        // Plotting parameters: 
        var plotOptions = {
            // Startup plot aesthetics: 
            
            // Minimum height of y axis: 5 seconds 
            Y_MIN_HEIGHT: 5, 
            // Desired number of ticks on the y axis 
            Y_NUM_TICKS: 5,
            // Desired number of ticks on the y axis for outliers
            Y_NUM_TICKS_OUT: 2,
            // Minimum number of dates on the x axis: 2 weeks 
            X_MIN_DAYS: 14, 
            // Padding to use to offset month labels
            MONTH_TICK_PADDING: 15,
            // Minimum point radius 
            MIN_POINT_RAD: 2.5,  
            // Maximum point radius 
            MAX_POINT_RAD: 5, 
            // Proportion of space allocated to a single day that the point radius should take
            POINT_DAY_PROP: 0.5, 
            // Proportion of plot height that should be dedicated to outliers, if any. 
            OUTLIER_PLOT_PROP: 0.25, 
            
            // Plot sizing: 
            
            // Vertical space to allocate for crash indicator
            CRASH_HEIGHT: 0, 
            // Padding to add at top of entire plot - primarily to stop top axis label getting cut off. 
            TOP_PADDING: 5,
            // Vertical space for the x axis (ticks and labels)
            X_AXIS_HEIGHT: 32, 
            // Vertical space to add between main plot and outlier plot, if any. 
            OUTLIER_GAP: 15, 
            // Vertical amount by which the top of the plot (and the y axis) should exceed the highest datapoint.
            MAIN_PLOT_TOP_PADDING: 20, 
            // Vertical amount by which the top and bottom of the outlier plot (and the y axis) 
            // should exceed the highest and lowest datapoints respectively.
            OUTLIER_PLOT_PADDING: 15, 
            // Padding between the left and right edges of the plot and the first and last days
            LEFT_RIGHT_PADDING: 20, 
            
            // Version updates: 
            
            // Horizontal offset of version labels from date. 
            LABEL_H_OFFSET: 5, 
            // Vertical offset of version labels from the top. 
            LABEL_V_OFFSET: 12, 
            
            // Build updates: 
            
            // Amount by which to raise the build update tick above the x axis. 
            UPDATE_TICK_OFFSET: 5, 
            // Length of the build update tick. 
            UPDATE_TICK_LENGTH: 10, 
            
            // Crash indicators: 
                
            // Proportion of space allocated to a single day that the crash point radius should take
            CRASH_DAY_PROP: 0.9, 
            // Radius parameter for rounded corners for crash indicators
            CRASH_RX: 4, 
            // Max number of crashes to be registered on the colour scale 
            // Higher numbers of crashes will be capped at this 
            CRASH_NUM_CAP: 10, 
            // Range to specify for the crash colour scale
            CRASH_COL_RANGE: ["#ffc966", "#4c0000"], 
            // Height of crash indicator arrow
            CRASH_ARROW_HEIGHT: 5,
            // Width of crash indicator arrow as a proportion of crash indicator width. 
            CRASH_ARROW_WIDTH_PROP: 0.5,
            
            // Outlier detection: 
            
            // The number of values flagged as outliers should not exceed this proportion of the data. 
            MAX_PROP_OUTLIERS: 0.1,
            // A value is flagged as an outlier if its distance from the next largest value 
            // is larger than this proportion of the maximum value. 
            MAX_GAP_PROP: 0.7
            // MAX_GAP_PROP: 0.51
                
        }, 
        
        optionGetter = function(options) {
            if(typeof options === "undefined") {
                return function(key) { 
                    return plotOptions[key];
                };
            }
            return function(key) { 
                return options[key] || plotOptions[key];
            };
        };
        
        
        // Outer container. 
        var graphContainer = d3.select(".graph");
        
        // Store dimensions of the outer svg container
        plotOptions["CONTAINER_WIDTH"] = parseInt(graphContainer.style("width"), 10);
        plotOptions["CONTAINER_HEIGHT"] = parseInt(graphContainer.style("height"), 10);
        
               
        // Plot sizing variables to be computed: 
            
        // The height of the main startup times plot area, excluding axes and the outlier plot, if any. 
        var mainPlotHeight,
            // The height of the outlier plot area. 
            outlierPlotHeight, 
            // The amount by which the main plot should be shifted downwards within the overall plot area. 
            // Non-zero if outlier plot is present. 
            mainPlotOffset, 
            // Width of the plot area. 
            plotWidth, 
            // The horizontal space allocated to one day. 
            dayWidth;
            
            
        // Plot scales. 
        var x, y, yOut;  
        
        
        // Plotting functionality:
            
        // Add indicators for version updates. 
        // Draw vertical dotted lines and label with the version numbers. 
        var drawVersionUpdates = function(updateData, mainPlot, outlierPlot, options) {
            options = optionGetter(options);
            
            // Draw version lines as another axis. 
            var versionUpdateAxis = d3.svg.axis().scale(x).orient("bottom")
                .tickValues(updateData.map(function(d) { return d.date; }));
                
            mainPlot.append("g").attr("class", "version-update")
                .attr("transform", "translate(0," + mainPlotHeight + ")")
                .call(versionUpdateAxis.tickSize(-mainPlotHeight));
            
            if(typeof outlierPlot !== "undefined") { 
                outlierPlot.append("g").attr("class", "version-update")
                .attr("transform", "translate(0," + outlierPlotHeight + ")")
                .call(versionUpdateAxis.tickSize(-outlierPlotHeight));
            }
                       
            // Add version labels, positioned vertically. 
            // Add them to outlier plot if present, otherwise add to main plot. 
            var plotToLabel = (typeof outlierPlot !== "undefined") ? outlierPlot : mainPlot;
            plotToLabel.selectAll(".version-label text")
                .data(updateData).enter().append("text").attr("class", "version-label")
                .attr("x", -options("LABEL_H_OFFSET")).attr("y", function(d) { return x(d.date) + options("LABEL_V_OFFSET"); })
                .attr("text-anchor", "end").attr("transform", "rotate(-90)")
                .text(function(d) { return d.updates.version; });
        }, 
        
        // Add indicators for build updates as extra tick marks on x axis. 
        drawBuildUpdates = function(updateData, mainPlot, options) {
            options = optionGetter(options);
            
            var buildUpdateAxis = d3.svg.axis().scale(x).orient("bottom")
                .tickValues(updateData.map(function(d) { return d.date; }))
                .tickSize(options("UPDATE_TICK_LENGTH"));
                
            mainPlot.append("g").attr("class", "build-update")
                .attr("transform", "translate(0," + (mainPlotHeight - options("UPDATE_TICK_OFFSET")) + ")")
                .call(buildUpdateAxis);
        }, 
        
        // Add crash indicators.         
        // Draw as coloured boxes with arrows underneath x axis. 
        // Intensity of colour indicates number of crashes.             
        drawCrashes = function(crashData, container, options) {
            options = optionGetter(options);
            
            // Group for crash indicators below x axis. 
            var crashes = container.append("g")
                .attr("transform", "translate(0," + (mainPlotOffset + mainPlotHeight + options("X_AXIS_HEIGHT")) + ")");
             
            var boxHeight = options("CRASH_HEIGHT") - options("CRASH_ARROW_HEIGHT"),
                // Scale the indicator width according to the horizontal space allocated per day. 
                // Restrict the indicator to be no wider than it is tall. 
                boxWidth = Math.min(dayWidth * options("CRASH_DAY_PROP"), boxHeight), 
                // Width of the base of the arrow. 
                arrowWidth = boxWidth * options("CRASH_ARROW_WIDTH_PROP");
                    
            // Set up colour scale for crashes. 
            var crashScale = d3.scale.linear()
                // Cap maximum number of crashes to register on the scale. 
                .domain([1, options("CRASH_NUM_CAP")]).range(options("CRASH_COL_RANGE"));
            
            // Add crash indicators boxes, leaving space for arrows on top. 
            crashes.selectAll("rect").data(crashData).enter().append("rect")
                .attr("x", function(d) { return x(d.date) - boxWidth/2; })
                .attr("y", options("CRASH_ARROW_HEIGHT")).attr("width", boxWidth)
                .attr("height", boxHeight).attr("rx", options("CRASH_RX"))
                .style("fill", function(d) { 
                    return crashScale(d.crashCount > options("CRASH_NUM_CAP") ? options("CRASH_NUM_CAP") : d.crashCount); 
                });
            
            // Add arrows pointing to x-axis. 
            crashes.selectAll("polygon").data(crashData).enter().append("polygon")
                .attr("points", function(d) { 
                    return (x(d.date) - arrowWidth / 2) + "," + options("CRASH_ARROW_HEIGHT") + " " + 
                        (x(d.date) + arrowWidth / 2) + "," + options("CRASH_ARROW_HEIGHT") + " " + 
                        x(d.date) + ",0";
                })
                .style("fill", function(d) { 
                    return crashScale(d.crashCount > options("CRASH_NUM_CAP") ? options("CRASH_NUM_CAP") : d.crashCount); 
                });
        }, 
        
        // Determine which datapoints should be plotted as outliers. 
        // Input should be data in the form of an array of objects, 
        // along with the key used to identify the values. 
        // Outputs an array of indices of the elements in the input data array 
        // that should be considered outliers, if any. 
        detectOutliers = function(data, valueKey, options) {
            options = optionGetter(options);
            
            if(data.length == 0)
                return [];
                
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
            // gaps array will have length n - 1. 
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
                stoppingPoint = n * (1 - options("MAX_PROP_OUTLIERS")),
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
                if(maxGap > vals[upper].value * options("MAX_GAP_PROP") && indexOfMax > stoppingPoint) {
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
        
        }, 
        
        // Prepare the startup plot area. 
        // Removes the old plot and create a fresh outer svg container. 
        // Sets up x and y axes and scales. 
        // Computes the necessary y axis padding, and adjusts the inner container accordingly. 
        // Adds value axes, gridlines and background. 
        // Requires the dataset of startup times to be plotted, the key to access the data values, 
        // the range of dates to display on the x axis (array of length 2),
        // and optionally the dataset of outlying startup times to be plotted separately, 
        // and a set of options (as an object) overriding those in plotOptions. 
        // Returns the d3 selections for the adjusted inner container, the main plot area, and the outlier plot area, if available.  
        setUpPlotArea = function(startupData, dataKey, dateRange, outlierData, options) {
            startupData = startupData || [];
            outlierData = outlierData || [];
            options = optionGetter(options);
            
            graphContainer.select("#svgplot").remove();
            
            // Set sizing. 
            mainPlotHeight = options("CONTAINER_HEIGHT") 
                - options("TOP_PADDING") 
                - options("X_AXIS_HEIGHT") 
                - options("CRASH_HEIGHT"), 
            outlierPlotHeight = 0, 
            mainPlotOffset = 0, 
            plotWidth = options("CONTAINER_WIDTH");
            
            // Set y axis label position relative to the height of the plot. 
            d3.select("#yaxis-label").style("top", Math.round(mainPlotHeight / 2) + "px");
           
            var svg = graphContainer.append("svg:svg").attr("id", "svgplot")
                .attr("width", options("CONTAINER_WIDTH") + "px")
                .attr("height", options("CONTAINER_HEIGHT") + "px");
                
            // Adjust sizing variables to accomodate outlier plot, in necessary.
            if(outlierData.length > 0) {
                outlierPlotHeight = mainPlotHeight * options("OUTLIER_PLOT_PROP");
                mainPlotOffset = outlierPlotHeight + options("OUTLIER_GAP");
                mainPlotHeight -= mainPlotOffset;
            }
            
            // Create y scales and axes. 
            var yAxis, yAxisOut;
            
            y = d3.scale.linear()
                // Allocate space from 0 to maximum value in dataset. 
                // If maximum value is less than Y_MIN_HEIGHT, extend to Y_MIN_HEIGHT. 
                .domain([ 0, 
                    (startupData.length == 0) ? 
                        options("Y_MIN_HEIGHT") : 
                        Math.max(options("Y_MIN_HEIGHT"), d3.max(startupData, function(d) { 
                            return d[dataKey]; 
                        }))
                ])
                .range([mainPlotHeight, options("MAIN_PLOT_TOP_PADDING")]); 
            // Update scale to incorporate extra space at the top. 
            y.domain([0, y.invert(0)]).range([mainPlotHeight, 0]);
            
            yAxis = d3.svg.axis().scale(y).orient("left").ticks(options("Y_NUM_TICKS"));
            
            if(outlierData.length > 0) {
                yOut = d3.scale.linear()
                    // Domain should incorporate outlier values. 
                    // If only a single outlier, pad domain. 
                    .domain(outlierData.length > 1 ? d3.extent(outlierData, function(d) {
                        return d[dataKey]; 
                    }) : [ Math.floor(outlierData[0][dataKey]), Math.ceil(outlierData[0][dataKey]) ])
                    .range([ outlierPlotHeight - options("OUTLIER_PLOT_PADDING"), options("OUTLIER_PLOT_PADDING") ]); 
                // Update scale to incorporate extra space at the top. 
                yOut.domain([ yOut.invert(outlierPlotHeight), yOut.invert(0) ])
                    .range([outlierPlotHeight, 0]);
                    
                yAxisOut = d3.svg.axis().scale(yOut).orient("left");
                if(outlierData.length == 1) { 
                    yAxisOut.tickValues([ Math.floor(outlierData[0][dataKey]), Math.ceil(outlierData[0][dataKey]) ])
                        .tickFormat(d3.format(".0f"));
                } else { 
                    yAxisOut.ticks(options("Y_NUM_TICKS_OUT"));
                }
            }
            
            
            // Add y axes to the plot and record the amount of horizontal space they occupy. 
            // Compute padding according to actual space taken by y axis including ticks and labels. 
           
            var plotContainer = svg.append("g"), 
                axisElement, 
                result = {}, 
                mainPlotArea;
                
            var yAxisPadding = 0;
            
            if(outlierData.length > 0) {
                axisElement = plotContainer.append("g").attr("class", "y axis").call(yAxisOut);
                yAxisPadding = Math.max(yAxisPadding, axisElement[0][0].getBBox().width);
            }
            
            axisElement = plotContainer.append("g").attr("transform", "translate(0," + mainPlotOffset + ")")
                .attr("class", "y axis").call(yAxis);
            yAxisPadding = Math.max(yAxisPadding, axisElement[0][0].getBBox().width);
            
            // Padding for y axis has now been determined. Make corresponding adjustments. 
            plotContainer.attr("transform", "translate(" + yAxisPadding + ", " + options("TOP_PADDING") + ")");
            plotWidth -= yAxisPadding;
            
            result["container"] = plotContainer;
            
            // Add group for main plot area. 
            mainPlotArea = plotContainer.insert("g", ":first-child")
                .attr("transform", "translate(" + 0 + ", " + mainPlotOffset + ")"); 
                
            // Add background colour.  
            mainPlotArea.append("rect").attr("class", "plot-background")
                .attr("width", plotWidth).attr("height", mainPlotHeight);
            
            // Add gridlines as a separate axis. 
            mainPlotArea.append("g").attr("class", "gridlines")
                .call(yAxis.tickSize(-plotWidth));
                
            result["main"] = mainPlotArea;
                
            // If have separate outlier plot, follow same steps to create subplot area. 
            if(outlierData.length > 0) {
                var outlierPlotArea = plotContainer.insert("g", ":first-child");
                
                // Add background and gridlines. 
                outlierPlotArea.append("rect").attr("class", "plot-background")
                    .attr("width", plotWidth).attr("height", outlierPlotHeight);
                outlierPlotArea.append("g").attr("class", "gridlines")
                    .call(yAxisOut.tickSize(-plotWidth));
            
                // Add dotted boundary separators. 
                outlierPlotArea.append("line").attr("x1", 0).attr("y1", outlierPlotHeight)
                    .attr("x2", plotWidth).attr("y2", outlierPlotHeight)
                    .attr("class", "boundary");
                mainPlotArea.append("line").attr("x1", 0).attr("y1", 0)
                    .attr("x2", plotWidth).attr("y2", 0)
                    .attr("class", "boundary");
                    
                result["outlier"] = outlierPlotArea;
            }
            
            // Create x (date) scale and axis. 
            
            x = d3.time.scale().domain([ dateRange[0], d3.time.day(dateRange[1])])
                .range([options("LEFT_RIGHT_PADDING"), plotWidth - options("LEFT_RIGHT_PADDING")]);
            
            // Compute the horizontal space per day. 
            dayWidth = x(d3.time.day.offset(dateRange[0], 1)) - x(dateRange[0]);
            
            // Add date axes. 
            var xAxis = d3.svg.axis().scale(x).orient("bottom");
            
            // Main axis should show only dates. 
            mainPlotArea.append("g").attr("class", "date axis")
                .attr("transform", "translate(0," + mainPlotHeight + ")")
                .call(xAxis.tickFormat(d3.time.format("%d")));
            
            // Secondary axis should show months, including month of earliest day.  
            var monthTicks = d3.time.months(dateRange[0], dateRange[1]);
            monthTicks.push(dateRange[0]);
            
            mainPlotArea.append("g").attr("class", "month axis")
                .attr("transform", "translate(0," + mainPlotHeight + ")")
                .call(xAxis.tickValues(monthTicks).tickFormat(d3.time.format("%b"))
                    .tickPadding(options("MONTH_TICK_PADDING")));
            
            return result;    
        };
      
       
        // Load the relevant data and display the Average plot. 
        // Data and computed values are not cached - data should refresh on each load. 
        function drawAveragePlot() {
            // Default amount of vertical space for the crash indicators, if desired. 
            var CRASH_HEIGHT_DEFAULT = 20;
            
            // Load data. 
            var graphData = getGraphData(true);
            
            // Dates are interpreted as midnight GMT. Change to midnight local time for display purposes. 
            graphData.forEach(function(d) { d.date = d3.time.day(d.date); });
            
            // Extract startup time data. 
            // Remove dates with medTime undefined or null (means that there was no sessions startups for that day). 
            var startupData = graphData.filter(function(d) { 
                // return typeof d.medTime !== "undefined" && d.medTime !== null; 
                return d.medTime != null; 
            });
            
            // Separate outliers, if any.  
            var outlierIndices = detectOutliers(startupData, "medTime"), 
                outlierData = [];
            
            if(outlierIndices.length > 0) { 
                outlierIndices.forEach(function(d) { 
                    outlierData.push(startupData.splice(d, 1)[0]);
                });
            }
            
            // Compute date range to include on the plot. 
            // If earliest date is less than two weeks ago, set to two weeks ago.
            var today = new Date(), 
                earliest = (graphData.length == 0) ? 
                    d3.time.day(d3.time.day.offset(today, -plotOptions.X_MIN_DAYS)) : 
                    new Date(Math.min(
                        d3.time.day(d3.time.day.offset(today, -plotOptions.X_MIN_DAYS)), 
                        d3.min(graphData, function(d) { return d.date; })
                    ));
                
            
            
            
        // /** Not in v1: 
        
            var options = {};
        
            if(graphData.length > 0 && graphData.some(function(d) { return d.crashCount > 0; })) {
                // Adjust space to accomodate crash indicator, if necessary. 
                options["CRASH_HEIGHT"] = CRASH_HEIGHT_DEFAULT;
            } 
        
        // */   
                
            // Initialize plot. 
            var plot = setUpPlotArea(
                    startupData, 
                    "medTime", 
                    [ earliest, d3.time.day(today) ], 
                    outlierData 
                    // /** 
                    ,options 
                    // */
                );
   
            
            // Add update indicators. 
            if(graphData.length > 0) {
                // Add indicators for version updates. 
                var updateData = graphData.filter(function(d) { 
                        return typeof d.updates !== "undefined" && typeof d.updates.version !== "undefined"; 
                    });
                if(updateData.length > 0) { 
                    drawVersionUpdates(updateData, plot.main, plot.outlier);
                }
                
                
            // /** Not in v1
            
                // Add indicators for build updates. 
                // Don't include dates with major version updates. 
                updateData = graphData.filter(function(d) {
                        return typeof d.updates !== "undefined" && 
                            typeof d.updates.build !== "undefined" && 
                            typeof d.updates.version === "undefined"; 
                    });
                if(updateData.length > 0) { 
                    drawBuildUpdates(updateData, plot.main);
                }
                
            // */
            
            }
            
            // Add points. 
            
            // Scale the point radius according to the horizontal space allocated per day. 
            var pointRadius = Math.min(Math.max(dayWidth * plotOptions.POINT_DAY_PROP, plotOptions.MIN_POINT_RAD), plotOptions.MAX_POINT_RAD); 
                         
            if(outlierData.length > 0) {
                plot.outlier.selectAll("circle").data(outlierData).enter().append("circle")
                    .attr("class", "startup-point").attr("r", pointRadius)
                    .attr("cx", function(d) { return x(d.date); })
                    .attr("cy", function(d) { return yOut(d.medTime); });
            }
            
            if(startupData.length > 0) {
                plot.main.selectAll("circle").data(startupData).enter().append("circle")
                    .attr("class", "startup-point").attr("r", pointRadius)
                    .attr("cx", function(d) { return x(d.date); })
                    .attr("cy", function(d) { return y(d.medTime); });
            }
            
                
        // /** Not in v1. 
        
            // Add crash indicators, if any.         
            if(graphData.length > 0) {
                var crashData = graphData.filter(function(d) { return d.crashCount > 0; });
                if(crashData.length > 0) {
                    drawCrashes(crashData, plot.container, options); 
                }
            }
            
        // */
               
        }
        
        // Load the relevant data and display the All plot. 
        // Data and computed values are not cached - data should refresh on each load. 
        function drawAllPlot() {
            // Default amount of vertical space for the crash indicators, if desired. 
            var CRASH_HEIGHT_DEFAULT = 20;
            
            // Load data. 
            var graphData = getGraphData(false);
            
            // Dates are interpreted as midnight GMT. Change to midnight local time for display purposes. 
            graphData.forEach(function(d) { d.date = d3.time.day(d.date); });
                 
            // Extract startup time data. 
            var startupData = [];
            // Flatten data to an array of objects of the form { date, time }.
            graphData.forEach(function(d) { 
                if(d.times.length > 0) {
                    d.times.forEach(function(t) { 
                        startupData.push({
                            "date": d.date, 
                            "value": t
                        });
                    });
                }
            });
            
            // Separate outliers, if any.  
            var outlierIndices = detectOutliers(startupData, "value"), 
                outlierData = [];
            
            if(outlierIndices.length > 0) { 
                outlierIndices.forEach(function(d) { 
                    outlierData.push(startupData.splice(d, 1)[0]);
                });
            }
            
            // Compute date range to include on the plot. 
            // If earliest date is less than two weeks ago, set to two weeks ago.
            var today = new Date(), 
                earliest = (graphData.length == 0) ? 
                    d3.time.day(d3.time.day.offset(today, -plotOptions.X_MIN_DAYS)) : 
                    new Date(Math.min(
                        d3.time.day(d3.time.day.offset(today, -plotOptions.X_MIN_DAYS)), 
                        d3.min(graphData, function(d) { return d.date; })
                    ));
            
        // /** Not in v1: 
        
            var options = {};
        
            if(graphData.length > 0 && graphData.some(function(d) { return d.crashCount > 0; })) {
                // Adjust space to accomodate crash indicator, if necessary. 
                options["CRASH_HEIGHT"] = CRASH_HEIGHT_DEFAULT;
            } 
        
        // */   
                
            // Initialize plot. 
            var plot = setUpPlotArea(
                    startupData, 
                    "value", 
                    [ earliest, d3.time.day(today) ], 
                    outlierData
                    // /** 
                    ,options 
                    // */
                );
   
   
            
            if(graphData.length > 0) {
                // Add indicators for version updates. 
                var updateData = graphData.filter(function(d) { 
                        return typeof d.updates !== "undefined" && typeof d.updates.version !== "undefined"; 
                    });
                if(updateData.length > 0) { 
                    drawVersionUpdates(updateData, plot.main, plot.outlier);
                }
                
                
            // /** Not in v1
            
                // Add indicators for build updates. 
                // Don't include dates with major version updates. 
                updateData = graphData.filter(function(d) {
                        return typeof d.updates !== "undefined" && 
                            typeof d.updates.build !== "undefined" && 
                            typeof d.updates.version === "undefined"; 
                    });
                if(updateData.length > 0) { 
                    drawBuildUpdates(updateData, plot.main);
                }
                
            // */
            
            }
            

            // Add points. 
            
            // Scale the point radius according to the horizontal space allocated per day. 
            var pointRadius = Math.min(Math.max(dayWidth * plotOptions.POINT_DAY_PROP, plotOptions.MIN_POINT_RAD), plotOptions.MAX_POINT_RAD); 
                         
            if(outlierData.length > 0) {
                plot.outlier.selectAll("circle").data(outlierData).enter().append("circle")
                    .attr("class", "startup-point all").attr("r", pointRadius)
                    .attr("cx", function(d) { return x(d.date); })
                    .attr("cy", function(d) { return yOut(d.value); });
            }
            
            if(startupData.length > 0) {
                plot.main.selectAll("circle").data(startupData).enter().append("circle")
                    .attr("class", "startup-point all").attr("r", pointRadius)
                    .attr("cx", function(d) { return x(d.date); })
                    .attr("cy", function(d) { return y(d.value); });
            }
            
            
        // /** Not in v1. 
        
            // Add crash indicators, if any.         
            if(graphData.length > 0) {
                var crashData = graphData.filter(function(d) { return d.crashCount > 0; });
                if(crashData.length > 0) {
                    drawCrashes(crashData, plot.container, options); 
                }
            }
            
        // */
               
        
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
