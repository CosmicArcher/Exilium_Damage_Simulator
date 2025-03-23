import EventManager from "./EventManager.js"

let ActionLogSingleton;

class ActionLog {
    constructor() {
        if (ActionLogSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Action Log Instantiated");
            ActionLogSingleton = this;
            // queue for displaying each logged text using a setInterval()
            ActionLogSingleton.logQueue = [];
            ActionLogSingleton.isDisplaying = false;
            // event listeners for different text display
            EventManager.getInstance().addListener("damageDealt", ActionLogSingleton.displayDamage);
            EventManager.getInstance().addListener("fixedDamage", ActionLogSingleton.displayFixedDamage);
            EventManager.getInstance().addListener("avalanche", ActionLogSingleton.displayAvalanche);
            EventManager.getInstance().addListener("statusApplied", ActionLogSingleton.displayStatus);
            EventManager.getInstance().addListener("stackConsumption", ActionLogSingleton.displayStackConsumption);
            EventManager.getInstance().addListener("stabilityRegen", ActionLogSingleton.displayStabilityRegen);
        }
    }

    static getInstance() {
        if (!ActionLogSingleton)
            new ActionLog();
        return ActionLogSingleton;
    }
    // [attacker, target, damage, element, remaining stability, isCrit]
    displayDamage(param) {
        if (ActionLogSingleton) {
            ActionLogSingleton.addLog(`${param[0].getName()} dealt ${param[2]} ${param[5] ? "crit": "non-crit"} ${param[3]} damage to ${param[1].getName()}. 
                                                        Remaining Stability: ${param[4]}`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // [sourceName, target, damage, remaining stability]
    displayFixedDamage(param) {
        if (ActionLogSingleton) {
            ActionLogSingleton.addLog(`${param[0]} dealt ${param[2]} Fixed damage to ${param[1].getName()}. 
                                                        Remaining Stability: ${param[3]}`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // remaining stability
    displayAvalanche(param) {
        if (ActionLogSingleton) {
            ActionLogSingleton.addLog(`Avalanche consumed, Remaining Stability: ${param}`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // [sourceName, targetName, buffName, stacks]
    displayStatus(param) {
        if (ActionLogSingleton) {
            ActionLogSingleton.addLog(`${param[0]} applied ${param[3]>1?param[3]+" stacks of ":""}${param[2]} to ${param[1]==param[0]?"self":param[1]}`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // [sourceName, stacks, buffName]
    displayStackConsumption(param) {
        if (ActionLogSingleton) {
            ActionLogSingleton.addLog(`${param[0]} consumed ${param[1]} ${param[1] > 1 ? "stacks" : "stack"} of ${param[2]}`);
        }
        else
            console.error("Singleton not yet initialized");
    }

    displayStabilityRegen(param) {
        if (ActionLogSingleton) {
            ActionLogSingleton.addLog(`${param[0]} recovered stability. Remaining Stability: ${param[1]}`);
        }
        else
            console.error("Singleton not yet initialized");
    }

    addLog(text) {
        if (ActionLogSingleton) {
            ActionLogSingleton.logQueue.push(text);
            if (!ActionLogSingleton.isDisplaying)
                ActionLogSingleton.startLog();
        }
        else
            console.error("Singleton not yet initialized");
    }

    updateLog() {
        if (ActionLogSingleton) {
            if (ActionLogSingleton.logQueue.length > 0) {
                let newLog = d3.select("#ActionLog").insert("p", "p").text(ActionLogSingleton.logQueue.shift());
                newLog.style("margin-left", "-350px");
                newLog.transition().style("margin-left", "0px");
            }
            else
                ActionLogSingleton.pauseLog();
        }
        else
            console.error("Singleton not yet initialized");
    }

    startLog() {
        if (ActionLogSingleton) {
            ActionLogSingleton.timedInterval = setInterval(ActionLogSingleton.updateLog, 150);
            ActionLogSingleton.isDisplaying = true;
            console.log("Starting Action Log");
        }
        else
            console.error("Singleton not yet initialized");
    }

    pauseLog() {
        if (ActionLogSingleton) {
            clearInterval(ActionLogSingleton.timedInterval);
            ActionLogSingleton.isDisplaying = false;
            console.log("Stopping Action Log");
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default ActionLog;