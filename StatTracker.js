import EventManager from "./EventManager.js";

let StatTrackerSingleton;

class StatTracker {
    constructor() {
        if (StatTrackerSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Stat Tracker Instantiated");
            StatTrackerSingleton = this;
            this.resetTracker();

            EventManager.getInstance().addListener("damageDealtTypes", StatTrackerSingleton.addDamage);
            EventManager.getInstance().addListener("fixedDamage", StatTrackerSingleton.addFixedDamage);
        }
    }

    static getInstance() {
        if (!StatTrackerSingleton)
            new StatTracker();
        return StatTrackerSingleton;
    }

    resetTracker() {
        if (StatTrackerSingleton) {
            // array of doll damage dealt kept as objects with keys for each category (element, damage type, skill name, ammo type, crit)
            StatTrackerSingleton.dolls = [{}];
            StatTrackerSingleton.totalDamage = [0];
            // in case we will be rewinding, rewind damage tracked too
            StatTrackerSingleton.actionCount = 0;
        }
        else
            console.error("Singleton not yet initialized");
    }

    registerDoll(dollName) {
        if (StatTrackerSingleton) {
            let newObj = {
                "Special" : {
                    "Crit" : 0,
                    "Not Crit" : 0,
                    "Fixed" : 0,
                    "Total" : 0
                },
                "Ammo" : {
                    
                },
                "Element" : {

                },
                "Attack Type" : {

                },
                "Skill" : {

                }
            }
            StatTrackerSingleton.dolls[0][dollName] = newObj;
        }
        else
            console.error("Singleton not yet initialized");
    }
    // process damage dealt by doll
    // [dollName, skillName, element, ammo, damageType, damageDealt, iscrit]
    addDamage(param) {
        if (StatTrackerSingleton) {
            if (StatTrackerSingleton.dolls[StatTrackerSingleton.actionCount + 1].hasOwnProperty(param[0])) {
                let dollStats = StatTrackerSingleton.dolls[StatTrackerSingleton.actionCount + 1][param[0]];
                // add to skill total damage
                if (dollStats["Skill"].hasOwnProperty(param[1]))
                    dollStats["Skill"][param[1]] += param[5];
                else {
                    dollStats["Skill"][param[1]] = param[5];
                }
                // add to element total damage
                if (dollStats["Element"].hasOwnProperty(param[2]))
                    dollStats["Element"][param[2]] += param[5];
                else {
                    dollStats["Element"][param[2]] = param[5];
                }
                // add to ammo total damage
                if (dollStats["Ammo"].hasOwnProperty(param[3]))
                    dollStats["Ammo"][param[3]] += param[5];
                else {
                    dollStats["Ammo"][param[3]] = param[5];
                }
                // add to Attack Type total damage
                if (dollStats["Attack Type"].hasOwnProperty(param[4]))
                    dollStats["Attack Type"][param[4]] += param[5];
                else {
                    dollStats["Attack Type"][param[4]] = param[5];
                }
                // add to Special category total damage, crit or no crit
                if (param[6])
                    dollStats["Special"]["Crit"] += param[5];
                else {
                    dollStats["Special"]["Not Crit"] += param[5];
                }
                // add to total damage dealt by the doll
                    dollStats["Special"]["Total"] += param[5];
            }
            else
                console.error(`${param[0]} name does not exist in stat tracker`);
            // add total damage
            StatTrackerSingleton.totalDamage[StatTrackerSingleton.actionCount + 1] += param[5];
        }
        else
            console.error("Singleton not yet initialized");
    }
 // [sourceName, target, damage, remaining stability]
    addFixedDamage(param) {
        if (StatTrackerSingleton) {
            if (StatTrackerSingleton.dolls[StatTrackerSingleton.actionCount + 1].hasOwnProperty(param[0])) {
                StatTrackerSingleton.dolls[StatTrackerSingleton.actionCount + 1][param[0]]["Special"]["Fixed"] += param[2];
                StatTrackerSingleton.dolls[StatTrackerSingleton.actionCount + 1][param[0]]["Special"]["Total"] += param[2];
            }
            else
                console.error(`${param[0]} name does not exist in stat tracker`);
            // add total damage
            StatTrackerSingleton.totalDamage[StatTrackerSingleton.actionCount + 1] += param[2];
        }
        else
            console.error("Singleton not yet initialized");
    }

    startSimulation() {
        if (StatTrackerSingleton) {
            let newObj = {};
            // the object has 3 layers, dollname, category, type
            Object.keys(StatTrackerSingleton.dolls[0]).forEach(doll => {
                newObj[doll] = this.copyDollObj(doll, 0);
            });
            let newTotal = StatTrackerSingleton.totalDamage[0];
            
            StatTrackerSingleton.dolls.push(newObj);
            StatTrackerSingleton.totalDamage.push(newTotal);
        }
        else
            console.error("Singleton not yet initialized");
    }

    lockAction() {
        if (StatTrackerSingleton) {
            StatTrackerSingleton.actionCount++;
            let newObj = {};
            // the object has 3 layers, dollname, category, type
            Object.keys(StatTrackerSingleton.dolls[StatTrackerSingleton.actionCount]).forEach(doll => {
                newObj[doll] = this.copyDollObj(doll, StatTrackerSingleton.actionCount);
            });
            let newTotal = StatTrackerSingleton.totalDamage[StatTrackerSingleton.actionCount];
            
            StatTrackerSingleton.dolls.push(newObj);
            StatTrackerSingleton.totalDamage.push(newTotal);
        }
        else
            console.error("Singleton not yet initialized");
    }

    rewindToAction(actionNum) {
        if (StatTrackerSingleton) {
            StatTrackerSingleton.actionCount = actionNum;
            let newObj = {};
            // the object has 3 layers, dollname, category, type
            Object.keys(StatTrackerSingleton.dolls[actionNum]).forEach(doll => {
                newObj[doll] = this.copyDollObj(doll, actionNum);
            });
            let newTotal = StatTrackerSingleton.totalDamage[actionNum];

            let lengthToCut = StatTrackerSingleton.totalDamage.length - actionNum - 1;
            StatTrackerSingleton.totalDamage.splice(actionNum + 1, lengthToCut);
            StatTrackerSingleton.dolls.splice(actionNum + 1, lengthToCut);
            
            StatTrackerSingleton.dolls.push(newObj);
            StatTrackerSingleton.totalDamage.push(newTotal);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // for copying a doll's tracked stats at action number, used for locking and rewinding actions but can also be used to make mid-run charts down the line
    copyDollObj(dollName, actionNum) {
        if (StatTrackerSingleton) {
            if (actionNum < StatTrackerSingleton.dolls.length) {
                if (StatTrackerSingleton.dolls[actionNum].hasOwnProperty(dollName)) {
                    let dollCats = {};
                    // the object has 3 layers, dollname, category, type, then total value
                    Object.keys(StatTrackerSingleton.dolls[actionNum][dollName]).forEach(category => {
                        let typeData = {};
                        Object.keys(StatTrackerSingleton.dolls[actionNum][dollName][category]).forEach(type => {
                            typeData[type] = StatTrackerSingleton.dolls[actionNum][dollName][category][type];
                        });
                        dollCats[category] = typeData;
                    });
                    return dollCats;
                }
                else
                    console.error(`${dollName} does not exist in stat tracker`);
            }  
            else
                console.error("Action number exceeds damage length");
        }
        else
            console.error("Singleton not yet initialized");
    }

    getTotalDamage() {
        if (StatTrackerSingleton) {
            return StatTrackerSingleton.totalDamage[StatTrackerSingleton.actionCount + 1];
        }
        else
            console.error("Singleton not yet initialized");
    }

    getAllTotalDamage() {
        if (StatTrackerSingleton) {
            return StatTrackerSingleton.totalDamage;
        }
        else
            console.error("Singleton not yet initialized");
    }

    getAllDollDamage() {
        if (StatTrackerSingleton) {
            return StatTrackerSingleton.dolls;
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default StatTracker;