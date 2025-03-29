import GameStateManager from "./GameStateManager.js";
import StatTracker from "./StatTracker.js";

let ChartMakerSingleton;

class ChartMaker {
    constructor() {
        if (ChartMakerSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Chart Maker Instantiated");
            ChartMakerSingleton = this;
            ChartMakerSingleton.svg = null;
        }
    }

    static getInstance() {
        if (!ChartMakerSingleton)
            new ChartMaker();
        return ChartMakerSingleton;
    }

    createDPSChart() {
        if (ChartMakerSingleton) {
            let dollDamages = StatTracker.getInstance().getAllDollDamage();
            let totalDamages = StatTracker.getInstance().getAllTotalDamage();

            if (ChartMakerSingleton.svg) {
                ChartMakerSingleton.svg.remove();
            }
            // chart body
            let chart = d3.select("#DPSChart").append("svg")
                                                .attr("width", "700px")
                                                .attr("height", "300px");
            chart.append("g").attr("transform", `translate(50, 20)`);
            let xScale = d3.scaleBand().range([0, 600])
                                        .padding(0.1);
            // move the x-axis to the bottom of the chart instead of the default at the top
            let xAxis = chart.select("g").append("g").attr("transform", `translate(0, 260)`);
            // to have 0 at the bottom and the maximum value at the top, flip the input of range
            let yScale = d3.scaleBand().range([260, 0]);
            // the y-axis defaults to the left so no need to edit its transform
            let yAxis = chart.select("g").append("g");

            let dollNames = Object.keys(dollDamages[0]);
            xScale.domain(dollNames);
            xAxis.call(d3.axisBottom(xScale));

            let actionCount = GameStateManager.getInstance().getActionCount();
            let dollTotalDamage = [];
            Object.keys(dollDamages[actionCount]).forEach(doll => {
                let totalDamage = 0;
                Object.values(dollDamages[actionCount][doll]["Special"]).forEach(damage => {
                    totalDamage += damage;
                });
                dollTotalDamage.push(totalDamage);
            });
            yScale.domain([0, Math.max(...dollTotalDamage)]);
            yAxis.call(d3.axisLeft(yScale));

            let bars = chart.select("g").selectAll("rect").data(dollTotalDamage);
            bars.join("rect").transition()
                            .duration(1000)
                            .attr("x", (d,i) => xScale(Object.keys(dollDamages[0])[i]))
                            .attr("y", d => yScale(d))
                            .attr("width", xScale.bandwidth())
                            .attr("height", d => 260 - yScale(d))
                            .attr("fill", "blue");

            ChartMakerSingleton.svg = chart;
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default ChartMaker;