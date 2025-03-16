import { AttackTypes, SkillNames } from "./Enums.js";
import {Qiongjiu} from "./DollClasses.js";

let DollFactorySingleton;

class DollFactory {
    constructor() {
        if (DollFactorySingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Doll Factory Instantiated");
            DollFactorySingleton = this;
        }
    }

    static getInstance() {
        if (!DollFactorySingleton)
            new DollFactory();
        return DollFactorySingleton;
    }

    createDoll(name, defense, attack, crit_chance, crit_damage, fortification) {
        if (DollFactorySingleton) {
            let newDoll;
            switch(name) {
                case "Qiongjiu":
                    newDoll = new Qiongjiu(name, defense, attack, crit_chance, crit_damage, fortification);
                    break;
                default:
                    console.log(`${name} doll class does not exist`);
            }
            return newDoll;
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default DollFactory;