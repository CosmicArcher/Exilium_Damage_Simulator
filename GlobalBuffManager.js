let GlobalBuffManagerSingleton;

class GlobalBuffManager {
    constructor() {
        if (GlobalBuffManagerSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Global Buff Manager Instantiated");
            GlobalBuffManagerSingleton = this;
            // track actions made and end turn on every unit
            GlobalBuffManagerSingleton.initialize();
        }
    }

    static getInstance() {
        if (!GlobalBuffManagerSingleton)
            new GlobalBuffManager();
        return GlobalBuffManagerSingleton;
    }
    // return to a clean slate
    initialize() {
        if (GlobalBuffManagerSingleton) {
            GlobalBuffManagerSingleton.attackBoost = 0;
            GlobalBuffManagerSingleton.damageDealt = 0;
            GlobalBuffManagerSingleton.aoeDamageDealt = 0;
            GlobalBuffManagerSingleton.targetedDamageDealt = 0;
            GlobalBuffManagerSingleton.elementalDamage = {
                "Physical" : 0,
                "Freeze" : 0,
                "Burn" : 0,
                "Corrosion" : 0,
                "Hydro" : 0,
                "Electric" : 0
            }
        }
        else
            console.error("Singleton not yet initialized");
    }
 
    // global attack boost buff, most likely from platoon level
    setGlobalAttack(attackBoost) {
        if (GlobalBuffManagerSingleton) {
            GlobalBuffManagerSingleton.attackBoost = attackBoost;
        }
        else
            console.error("Singleton not yet initialized");
    }
    // add to the global stats instead of overwriting, typically only called if dushevnaya is present
    addGlobalAttack(attackBoost) {
        if (GlobalBuffManagerSingleton) {
            GlobalBuffManagerSingleton.attackBoost += attackBoost;
        }
        else
            console.error("Singleton not yet initialized");
    }
    getGlobalAttack() {
        if (GlobalBuffManagerSingleton)
            return GlobalBuffManagerSingleton.attackBoost;
        else
            console.error("Singleton not yet initialized");
    }
    // global damage boost buff, most likely from platoon level
    setGlobalDamage(damageDealt) {
        if (GlobalBuffManagerSingleton) {
            GlobalBuffManagerSingleton.damageDealt = damageDealt;
        }
        else
            console.error("Singleton not yet initialized");
    }
    addGlobalDamage(damageDealt) {
        if (GlobalBuffManagerSingleton) {
            GlobalBuffManagerSingleton.damageDealt += damageDealt;
        }
        else
            console.error("Singleton not yet initialized");
    }
    getGlobalDamage() {
        if (GlobalBuffManagerSingleton)
            return GlobalBuffManagerSingleton.damageDealt;
        else
            console.error("Singleton not yet initialized");
    }
    // global damage boost buff, most likely from platoon level
    setGlobalAoEDamage(aoeDamage) {
        if (GlobalBuffManagerSingleton) {
            GlobalBuffManagerSingleton.aoeDamageDealt = aoeDamage;
        }
        else
            console.error("Singleton not yet initialized");
    }
    addGlobalAoEDamage(aoeDamage) {
        if (GlobalBuffManagerSingleton) {
            GlobalBuffManagerSingleton.aoeDamageDealt += aoeDamage;
        }
        else
            console.error("Singleton not yet initialized");
    }
    getGlobalAoEDamage() {
        if (GlobalBuffManagerSingleton)
            return GlobalBuffManagerSingleton.aoeDamageDealt;
        else
            console.error("Singleton not yet initialized");
    }
    // global damage boost buff, most likely from platoon level
    setGlobalTargetedDamage(targetedDamage) {
        if (GlobalBuffManagerSingleton) {
            GlobalBuffManagerSingleton.targetedDamageDealt = targetedDamage;
        }
        else
            console.error("Singleton not yet initialized");
    }
    addGlobalTargetedDamage(targetedDamage) {
        if (GlobalBuffManagerSingleton) {
            GlobalBuffManagerSingleton.targetedDamageDealt += targetedDamage;
        }
        else
            console.error("Singleton not yet initialized");
    }
    getGlobalTargetedDamage() {
        if (GlobalBuffManagerSingleton)
            return GlobalBuffManagerSingleton.targetedDamageDealt;
        else
            console.error("Singleton not yet initialized");
    }
    // global elemental damage boost buff, most likely from dushevnaya
    setGlobalElementalDamage(element, elementalDamage) {
        if (GlobalBuffManagerSingleton) {
            if (GlobalBuffManagerSingleton.elementalDamage.hasOwnProperty(element))
                GlobalBuffManagerSingleton.elementalDamage[element] = elementalDamage;
            else
                console.error(`${element} does not exist in global buffs`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    addGlobalElementalDamage(element, elementalDamage) {
        if (GlobalBuffManagerSingleton) {
            if (GlobalBuffManagerSingleton.elementalDamage.hasOwnProperty(element))
                GlobalBuffManagerSingleton.elementalDamage[element] += elementalDamage;
            else
                console.error(`${element} does not exist in global buffs`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    getGlobalElementalDamage(element) {
        if (GlobalBuffManagerSingleton) {
            if (GlobalBuffManagerSingleton.elementalDamage.hasOwnProperty(element))
                return GlobalBuffManagerSingleton.elementalDamage[element];
            else
                console.error(`${element} does not exist in global buffs`);
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default GlobalBuffManager;