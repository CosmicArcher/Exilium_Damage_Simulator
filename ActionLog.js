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
            EventManager.getInstance().addListener("damageDealt", this.displayDamage);
            EventManager.getInstance().addListener("statusApplied", this.displayStatus);
        }
    }

    static getInstance() {
        if (!ActionLogSingleton)
            new ActionLog();
        return ActionLogSingleton;
    }
    // [attacker, target, damage, element, remaining stability]
    displayDamage(param) {
        if (ActionLogSingleton) {
            console.log(`${param[0].getName()} did ${param[2]} ${param[3]} damage to ${param[1].getName()}. Remaining Stability: ${param[4]}`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // [source, target, buffName]
    displayStatus(param) {
        if (ActionLogSingleton) {
            if (param[1].constructor == Array)
                param[1].forEach(d => {
                    console.log(`${param[0].getName()} applied ${param[2]} to ${d.getName()}`);
                });
            else
                console.log(`${param[0].getName()} applied ${param[2]} to ${param[1].getName()}`);
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default ActionLog;