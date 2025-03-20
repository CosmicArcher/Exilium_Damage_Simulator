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
            EventManager.getInstance().addListener("damageDealt", ActionLogSingleton.displayDamage);
            EventManager.getInstance().addListener("fixedDamage", ActionLogSingleton.displayFixedDamage);
            EventManager.getInstance().addListener("avalanche", ActionLogSingleton.displayAvalanche);
            EventManager.getInstance().addListener("statusApplied", ActionLogSingleton.displayStatus);
            EventManager.getInstance().addListener("stackConsumption", ActionLogSingleton.displayStackConsumption);
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
            d3.select("#ActionLog").insert("p", "p")
                                    .text(`${param[0].getName()} dealt ${param[2]} ${param[5] ? "crit": "non-crit"} ${param[3]} damage to ${param[1].getName()}. 
                                                        Remaining Stability: ${param[4]}`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // [sourceName, target, damage, remaining stability]
    displayFixedDamage(param) {
        if (ActionLogSingleton) {
            d3.select("#ActionLog").insert("p", "p")
                                    .text(`${param[0]} dealt ${param[2]} Fixed damage to ${param[1].getName()}. 
                                                        Remaining Stability: ${param[3]}`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // remaining stability
    displayAvalanche(param) {
        if (ActionLogSingleton) {
            d3.select("#ActionLog").insert("p", "p")
                                    .text(`Avalanche consumed, Remaining Stability: ${param}`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // [sourceName, target, buffName, stacks]
    displayStatus(param) {
        if (ActionLogSingleton) {
            d3.select("#ActionLog").insert("p", "p")
                                    .text(`${param[0]} applied ${param[3]>1?param[3]+" stacks of ":""}${param[2]} to ${param[1]==param[0]?"self":param[1]}`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // [sourceName, stacks, buffName]
    displayStackConsumption(param) {
        if (ActionLogSingleton) {
            d3.select("#ActionLog").insert("p", "p").text(`${param[0]} consumed ${param[1]} ${param[1] > 1 ? "stacks" : "stack"} of ${param[2]}`);
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default ActionLog;