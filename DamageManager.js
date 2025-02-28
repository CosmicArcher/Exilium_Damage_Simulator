import Doll from "./Doll.js";
import Target from "./Target.js";

let DamageManagerSingleton;

class DamageManager {
    constructor() {
        if (DamageManagerSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Damage Manager Instantiated");
            DamageManagerSingleton = this;
        }
    }

    static getInstance() {
        if (!DamageManagerSingleton)
            new DamageManager();
        return DamageManagerSingleton;
    }

    calculateDamage(attacker, target, base_damage, element, ammo_type) {

    }
}

export default DamageManager;