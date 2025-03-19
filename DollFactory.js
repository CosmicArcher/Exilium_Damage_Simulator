import {Makiatto, Papasha, PapashaSummon, Qiongjiu, Suomi} from "./DollClasses.js";
import GameStateManager from "./GameStateManager.js";
import TurnManager from "./TurnManager.js";

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

    createDoll(name, defense, attack, crit_chance, crit_damage, fortification, keys) {
        if (DollFactorySingleton) {
            let newDoll;
            switch(name) {
                case "Qiongjiu":
                    newDoll = new Qiongjiu(defense, attack, crit_chance, crit_damage, fortification, keys);
                    TurnManager.getInstance().registerTargetedSupporter(name, false);
                    TurnManager.getInstance().registerPriorityDebuffer(name);
                    break;
                case "Makiatto":
                    newDoll = new Makiatto(defense, attack, crit_chance, crit_damage, fortification, keys);
                    break;
                case "Suomi":
                    newDoll = new Suomi(defense, attack, crit_chance, crit_damage, fortification, keys);
                    TurnManager.getInstance().registerTargetedSupporter(name, true);
                    TurnManager.getInstance().registerActionListener(name);
                    break;
                case "Papasha":
                    newDoll = new Papasha(defense, attack, crit_chance, crit_damage, fortification, keys);
                    break;
                case "Papasha Summon":
                    newDoll = new PapashaSummon(defense, attack, crit_chance, crit_damage, fortification, keys);
                    break;
                default:
                    console.log(`${name} doll class does not exist`);
            }
            GameStateManager.getInstance().registerDoll(newDoll);
            return newDoll;
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default DollFactory;