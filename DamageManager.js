import Doll from "./Doll.js";
import Target from "./Target.js";
import GameStateManager from "./GameStateManager.js";

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

    calculateDamage(attacker, baseDamage, element, ammoType, attackType, ignoreCover, isCrit, fixedDamage) {
        let target = GameStateManager.getInstance().getTarget();
        
        let defenseBuffs = Math.max(0, 1 + target.getDefenseBuffs() + attacker.getDefenseIgnore());
        let defModifier = attacker.getAttack() / (attacker.getAttack() + target.getDefense() * defenseBuffs);

        let coverValue = GameStateManager.getInstance().getCover();
        let coverModifier = 1 - coverValue - (target.getStability() > 0 && ignoreCover ? 0.6 : 0);

        let critModifier = isCrit ? attacker.getCritDamage() : 1;

        let weaknessModifier = 1;
        target.getElementWeaknesses().forEach(d => {
            if (d == element)
                weaknessModifier += 0.1;
        });
        target.getAmmoWeaknesses().forEach(d => {
            if (d == ammoType)
                weaknessModifier += 0.1;
        });

        let totalBuffs = 1;
        totalBuffs += target.getDamageTaken();
        // make sure that totalbuffs doesn't become negative
        totalBuffs = Math.max(0, totalBuffs); 
        console.log([target, baseDamage, defModifier, coverModifier, critModifier, weaknessModifier, totalBuffs]);
        let damage = baseDamage * defModifier * critModifier * weaknessModifier * totalBuffs * coverModifier + fixedDamage;

        target.takeDamage();
        console.log(damage);
        return damage;
    }
}

export default DamageManager;