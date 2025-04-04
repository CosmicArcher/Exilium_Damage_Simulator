import Doll from "./Doll.js";
import {Cheeta, Daiyan, Klukai, Ksenia, Makiatto, MosinNagant, Papasha, PapashaSummon, Peritya, Qiongjiu, Sharkry, Suomi, Tololo, Vepley} from "./DollClasses.js";
import { AttackTypes, Elements, SkillNames } from "./Enums.js";
import GameStateManager from "./GameStateManager.js";
import StatTracker from "./StatTracker.js";
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
                    TurnManager.getInstance().registerInterceptor(name);
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
                case "Daiyan":
                    newDoll = new Daiyan(defense, attack, crit_chance, crit_damage, fortification, keys);
                    TurnManager.getInstance().registerInterceptor(name);
                    break;
                case "Tololo":
                    newDoll = new Tololo(defense, attack, crit_chance, crit_damage, fortification, keys);                   
                    TurnManager.getInstance().registerDamageListener(name, Elements.HYDRO);
                    break;
                case "Mosin-Nagant":
                    newDoll = new MosinNagant(defense, attack, crit_chance, crit_damage, fortification, keys);
                    TurnManager.getInstance().registerTargetedSupporter(name, false);
                    TurnManager.getInstance().registerBuffListener(name, Elements.ELECTRIC);
                    break;
                case "Vepley":
                    newDoll = new Vepley(defense, attack, crit_chance, crit_damage, fortification, keys);
                    break;
                case "Peritya":
                    newDoll = new Peritya(defense, attack, crit_chance, crit_damage, fortification, keys);
                    TurnManager.getInstance().registerDamageListener(name, AttackTypes.AOE);
                    break;
                case "Sharkry":
                    newDoll = new Sharkry(defense, attack, crit_chance, crit_damage, fortification, keys);
                    TurnManager.getInstance().registerBuffListener(name, "Overburn");
                    break;
                case "Cheeta":
                    newDoll = new Cheeta(defense, attack, crit_chance, crit_damage, fortification, keys);
                    TurnManager.getInstance().registerTargetedSupporter(name, true);
                    break;
                case "Ksenia":
                    newDoll = new Ksenia(defense, attack, crit_chance, crit_damage, fortification, keys);
                    TurnManager.getInstance().registerTargetedSupporter(name, true);
                    break;
                case "Klukai":
                    newDoll = new Klukai(defense, attack, crit_chance, crit_damage, fortification, keys);
                    // klukai listens for allied support attacks if she has her key 4
                    TurnManager.getInstance().registerDamageListener(name, SkillNames.SUPPORT);
                    // apply v2+ klukai self buff on run start this way because the constructor should not add stacking buffs otherwise it will explode when cloning
                    if (fortification > 1)
                        newDoll.addBuff("Competitive Spirit V2", "Klukai", -1, 3);
                    break;
                default:
                    // very basic version of the doll with no automated condition checks, support attacks, etc.
                    newDoll = new Doll(name, attack, crit_chance, crit_damage, fortification, keys);
                    console.log(`${name} doll class does not exist`);
            }
            GameStateManager.getInstance().registerDoll(newDoll);
            StatTracker.getInstance().registerDoll(name);
            return newDoll;
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default DollFactory;