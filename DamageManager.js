import Doll from "./Doll.js";
import Target from "./Target.js";
import GameStateManager from "./GameStateManager.js";
import {AttackTypes, Elements, AmmoTypes} from "./Enums.js";

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

    calculateDamage(attacker, target, baseDamage, element, ammoType, damageType, isCrit, critDamage, stabilityDamage, coverIgnore = 0) {
        let weaknessModifier = 1;
        target.getPhaseWeaknesses().forEach(d => {
            if (d == element || d == ammoType)
                weaknessModifier += 0.1;
        });
        // stability damage is increased by 2 per phase weakness, this is done after stability modifier buffs on the target or doll
        let totalStabDamage = Math.max(0, stabilityDamage + target.getStabilityDamageModifier() + attacker.getStabilityDamageModifier());
        console.log(totalStabDamage);
        totalStabDamage += parseInt(20 * (weaknessModifier - 1)); // instead of recounting the number of phase weaknesses, just get the decimal and multiply by 20
        console.log([totalStabDamage, 20 * (weaknessModifier - 1), weaknessModifier])
        // if any phase weakness is exploited, stability damage happens before the attack rather than after
        if (weaknessModifier > 1)
            target.reduceStability(totalStabDamage);
        console.log(target.getStability());
        let defenseBuffs = Math.max(0, 1 + target.getDefenseBuffs() + attacker.getDefenseIgnore());
        let defModifier = attacker.getAttack() / (attacker.getAttack() + target.getDefense() * defenseBuffs);

        let coverValue = GameStateManager.getInstance().getCover();
        let coverModifier = 1 - Math.max(coverValue - coverIgnore, 0) - (target.getStability() > 0 && 
                                                                            !(damageType == AttackTypes.AOE || ammoType == AmmoTypes.MELEE) ? 0.6 : 0);

        let critModifier = isCrit ? critDamage : 1;

        let totalBuffs = 1;
        totalBuffs += target.getDamageTaken();
        totalBuffs += attacker.getDamageDealt();
        // make sure that totalbuffs doesn't become negative
        totalBuffs = Math.max(0, totalBuffs); 
        console.log([target, baseDamage, defModifier, coverModifier, critModifier, weaknessModifier, totalBuffs]);
        // damage has a minimum value of 1
        let damage = Math.max(baseDamage * defModifier * critModifier * weaknessModifier * totalBuffs * coverModifier, 1);
        // round resulting damage
        damage = Math.round(damage);
        // if no phase weakness was exploited, reduce stability after damage dealt
        if (weaknessModifier == 1)
            target.reduceStability(totalStabDamage);
        // inform the target that it has been "hit" and reduce the counters of any buffs that last for a number of hits rather than turns
        target.takeDamage();
        console.log(damage);
        return damage;
    }
    // will pass the damage to an event observer manager later
    applyFixedDamage(damage) {
        GameStateManager.getInstance().getTarget().takeDamage();
        console.log(damage);
    }
}

export default DamageManager;