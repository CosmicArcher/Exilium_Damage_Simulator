import GameStateManager from "./GameStateManager.js";
import StatTracker from "./StatTracker.js";

let ChartMakerSingleton;
let dollColors = ["olive", "violet", "deeppink", "orange", "dodgerblue", "maroon"];
let roundColors = ["yellow", "red", "mediumvioletred", "lime", "darkgreen", "blue", "gold", "ivory", "aquamarine"];

class ChartMaker {
    constructor() {
        if (ChartMakerSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Chart Maker Instantiated");
            ChartMakerSingleton = this;
            ChartMakerSingleton.DPSChart = {};
            ChartMakerSingleton.DPSChart.svg = null;
        }
    }

    static getInstance() {
        if (!ChartMakerSingleton)
            new ChartMaker();
        return ChartMakerSingleton;
    }

    static getDollColors() {
        return dollColors;
    }

    static createBarChartBase(htmlElement, spaceWidth, spaceHeight, marginLeft = 50, marginTop = 20, barSpacing = 0.1) {
        let chartSVG = d3.select(htmlElement).append("svg")
                                            .attr("width", spaceWidth)
                                            .attr("height", spaceHeight);
        let chartBody = chartSVG.append("g")
                                .attr("transform", `translate(${marginLeft}, ${marginTop})`);
            // assume left and top margins are equal to their counterparts
        let chartXScale = d3.scaleBand().range([0, spaceWidth - marginLeft * 2])
                                        .padding(barSpacing);
        // set x-axis to the bottom of the chart
        let chartXAxis = chartBody.append("g")
                                .attr("transform", `translate(0, ${spaceHeight - marginTop * 2})`);
        let chartYScale = d3.scaleLinear().range([spaceHeight - marginTop * 2, 0]);
        let chartYAxis = chartBody.append("g");

        return [chartSVG, chartBody, chartXScale, chartXAxis, chartYScale, chartYAxis];
    }

    static createLineChartBase(htmlElement, spaceWidth, spaceHeight, marginLeft = 50, marginTop = 20, legendWidth = 150, legendHeight = 150) {
        let chartSVG = d3.select(htmlElement).append("svg")
                                            .attr("width", spaceWidth)
                                            .attr("height", spaceHeight);
        let chartBody = chartSVG.append("g")
                                .attr("transform", `translate(${marginLeft}, ${marginTop})`);
        // assume left and top margins are equal to their counterparts
        let chartXScale = d3.scaleLinear().range([0, spaceWidth - marginLeft * 2]);
        // set x-axis to the bottom of the chart
        let chartXAxis = chartBody.append("g")
                                .attr("transform", `translate(0, ${spaceHeight - marginTop * 2})`);
        let chartYScale = d3.scaleLinear().range([spaceHeight - marginTop * 2, 0]);
        let chartYAxis = chartBody.append("g");
        // create a box for the legend on the upper left because that is the most likely corner that will not block information on the line chart
        let chartLegend = chartSVG.append("svg")
                                .attr("width", legendWidth)
                                .attr("height", legendHeight)
                                .attr("x", marginLeft)
                                .attr("y", marginTop);

        return [chartSVG, chartBody, chartXScale, chartXAxis, chartYScale, chartYAxis, chartLegend];
    }

    createDPSChart() {
        if (ChartMakerSingleton) {
            let dollDamages = StatTracker.getInstance().getAllDollDamage();
            let totalDamages = StatTracker.getInstance().getAllTotalDamage();
            let actionCount = GameStateManager.getInstance().getActionCount();
            let rounds = GameStateManager.getInstance().getRounds();
            // only create the chart if an action has been done
            if (actionCount > 0) {
                // if chart does not exist yet, create the skeleton
                /*if (!ChartMakerSingleton.DPSChart.svg) {
                    let dpsChart = {};
                    let chartParts = ChartMaker.createBarChartBase("#DPSChart", 700, 300, 50, 20, 0.1);
                    dpsChart.svg = chartParts[0];
                    dpsChart.body = chartParts[1];
                    dpsChart.xScale = chartParts[2];
                    dpsChart.xAxis = chartParts[3];
                    dpsChart.yScale = chartParts[4];
                    dpsChart.yAxis = chartParts[5];

                    ChartMakerSingleton.DPSChart = dpsChart;
                }
                
                let dpsChart = ChartMakerSingleton.DPSChart;
                let dollNames = Object.keys(dollDamages[0]);
                dpsChart.xScale.domain(dollNames);
                dpsChart.xAxis.call(d3.axisBottom(dpsChart.xScale));

                let actionCount = GameStateManager.getInstance().getActionCount();
                let dollTotalDamage = [];
                Object.keys(dollDamages[actionCount]).forEach(doll => {
                    dollTotalDamage.push(dollDamages[actionCount][doll]["Special"]["Total"]);
                });
                dpsChart.yScale.domain([0, Math.max(...dollTotalDamage)]);
                dpsChart.yAxis.call(d3.axisLeft(dpsChart.yScale));

                let bars = dpsChart.body.selectAll("rect").data(dollTotalDamage);
                bars.join("rect").transition()
                                .duration(1000)
                                .attr("x", (d,i) => dpsChart.xScale(Object.keys(dollDamages[0])[i]))
                                .attr("y", d => dpsChart.yScale(d))
                                .attr("width", dpsChart.xScale.bandwidth())
                                .attr("height", d => 260 - dpsChart.yScale(d))
                                .attr("fill", "blue");
                */                
            if (!ChartMakerSingleton.DPSChart.svg) {
                    let dpsChart = {};
                    // set the space width to the full width of the screen on generation
                    let spaceWidth = document.getElementById("DPSChart").offsetWidth;
                    let chartParts = ChartMaker.createLineChartBase("#DPSChart", spaceWidth, 300, 50, 20, 150, 150);
                    dpsChart.svg = chartParts[0];
                    dpsChart.body = chartParts[1];
                    dpsChart.xScale = chartParts[2];
                    dpsChart.xAxis = chartParts[3];
                    dpsChart.yScale = chartParts[4];
                    dpsChart.yAxis = chartParts[5];
                    dpsChart.legend = chartParts[6];

                    ChartMakerSingleton.DPSChart = dpsChart;
                }
                else {
                    // update the width of the charts if the window was resized between actions
                    let spaceWidth = document.getElementById("DPSChart").offsetWidth;
                    ChartMakerSingleton.DPSChart.svg.attr("width", spaceWidth);
                    ChartMakerSingleton.DPSChart.xScale.range([0, spaceWidth - 100]);
                }
                
                let dpsChart = ChartMakerSingleton.DPSChart;

                dpsChart.xScale.domain([0, actionCount]);
                // set the ticks at each action including action 0
                dpsChart.xAxis.call(d3.axisBottom(dpsChart.xScale).ticks(actionCount+1));
                // flatten the nested objects into an array of objects
                let dollTotalDamage = [];
                // get the action number cutoffs at each round by getting the first action number where the round number changes
                let currRound = 1;
                let startCutoff = 0;
                let roundCutoffs = [];
                for (let i = 0; i <= actionCount; i++) {
                    Object.keys(dollDamages[i]).forEach(doll => {
                        let obj = {};
                        obj["ActionNumber"] = i;
                        obj["Doll"] = doll;
                        obj["Damage"] = dollDamages[i][doll]["Special"]["Total"];
                        dollTotalDamage.push(obj);
                    });
                    if (currRound < rounds[i]) {
                        roundCutoffs.push([startCutoff, i]);
                        currRound = rounds[i];
                        startCutoff = i;
                    }
                }
                // add the latest action count as the endpoint of the last round
                roundCutoffs.push([startCutoff, actionCount]);
                // use d3.max to pass a function to get the total damage of the latest action but use math.max to set a minimum value of 100 for the scale
                dpsChart.yScale.domain([0, Math.max(100,d3.max(dollTotalDamage, d => {
                    // only consider latest total damage for the scale
                    if (d.ActionNumber == actionCount)
                        return d.Damage;
                    return 0;
                }))]);
                // group the data by doll name
                dollTotalDamage = d3.group(dollTotalDamage, d => d.Doll);
                dpsChart.yAxis.call(d3.axisLeft(dpsChart.yScale));
                // color code the lines according to doll
                let color = d3.scaleOrdinal().range(dollColors);
                // use selectChildren instead of selectAll because the axes have path elements and selectAll will attempt to edit them instead of creating new paths
                let lines = dpsChart.body.selectChildren("path").data(dollTotalDamage);
                lines.join("path").transition()
                                .duration(1000)
                                .attr("fill", "none")
                                .attr("stroke", d => color(d[0]))
                                .attr("stroke-width", 1.5)
                                .attr("d", (actionData) => {
                                    let line = d3.line().x(d => dpsChart.xScale(d.ActionNumber)).y(d => dpsChart.yScale(d.Damage));
                                    return line(actionData[1]);
                                });
                // create background bars to more easily identify which round the parts of the plot belong to
                let bars = dpsChart.body.selectAll("rect").data(roundCutoffs);
                bars.join("rect").transition()
                                .duration(1000)
                                .attr("x", d => dpsChart.xScale(d[0]))
                                .attr("y", 0)
                                .attr("width", d => dpsChart.xScale(d[1]) - dpsChart.xScale(d[0]))
                                .attr("height", 260)
                                .attr("fill", (d, i) => roundColors[i])
                                .attr("opacity", 0.2);
                // create legend to identify which colored line belongs to which doll
                let legendColors = dpsChart.legend.selectAll("rect").data(dollTotalDamage);
                legendColors.join("rect")
                                .attr("x", 10)
                                .attr("y", (d,i) => 10 + i * 20)
                                .attr("width", 15)
                                .attr("height", 15)
                                .attr("fill", d => color(d[0]));
                let legendNames = dpsChart.legend.selectAll("text").data(dollTotalDamage);
                legendNames.join("text")
                                .attr("x", 30)
                                .attr("y", (d,i) => 10 + i * 20)
                                .text(d => d[0])
                                .attr("text-anchor", "left")
                                .style("alignment-baseline", "hanging");
                // finish the legend by adding a background color for easier reading
                dpsChart.legend.insert("rect", "rect")
                                .attr("width", dpsChart.legend.attr("width"))
                                .attr("height", dpsChart.legend.attr("height"))
                                .attr("fill", "lightgray")
                                .attr("opacity", 0.5);
            }
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default ChartMaker;