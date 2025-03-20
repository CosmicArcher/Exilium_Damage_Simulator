import Doll from "./Doll.js";
import Target from "./Target.js";
import GameStateManager from "./GameStateManager.js";
import EventManager from "./EventManager.js";
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

    calculateDamage(attacker, target, baseDamage, element, ammoType, damageType, isCrit, critDamage, stabilityDamage, coverIgnore = 0, skillName) {
        let weaknesses = 0;
        target.getPhaseWeaknesses().forEach(d => {
            if (d == element || d == ammoType)
                weaknesses++;
        });
        // stability modifier buffs on the target or doll, minimum of 0 before phase weakness adds 2 per weakness
        let totalStabDamage = Math.max(0, stabilityDamage + target.getStabilityDamageModifier() + attacker.getStabilityDamageModifier());
        totalStabDamage += weaknesses * 2;
        let weaknessModifier = 1 + weaknesses * 0.1;
        // if any phase weakness is exploited, stability damage happens before the attack rather than after
        if (weaknesses > 0)
            target.reduceStability(totalStabDamage);
        // some dolls ignore a set amount of stability
        let effectiveStability = Math.max(target.getStability() - attacker.getStabilityIgnore(),0);

        let defenseBuffs = Math.max(0, 1 + target.getDefenseBuffs() - attacker.getDefenseIgnore());
        let defModifier = attacker.getAttack() / (attacker.getAttack() + target.getDefense() * defenseBuffs);

        let coverValue = GameStateManager.getInstance().getCover();
        let coverModifier = 1 - Math.max(coverValue - coverIgnore - attacker.getCoverIgnore(), 0) - (effectiveStability > 0 && 
                                                                            !(damageType == AttackTypes.AOE || ammoType == AmmoTypes.MELEE) ? 0.6 : 0);

        let critModifier = isCrit ? critDamage : 1;
        // there are a lot of damage dealt/taken effects that are specific to certain conditions
        let totalBuffs = 1;
        // check if there is remaining stability, apply stability based damage reduction
        if (effectiveStability > 0) {
            totalBuffs -= target.getDRPerStab() * effectiveStability;
            totalBuffs -= target.getDRWithStab();
        }
        totalBuffs += target.getDamageTaken();
        totalBuffs += attacker.getDamageDealt();
        if (damageType == AttackTypes.TARGETED) {
            totalBuffs += target.getTargetedDamageTaken();
            totalBuffs += attacker.getTargetedDamage();
        }
        else {
            totalBuffs += target.getAoEDamageTaken();
            totalBuffs += attacker.getAoEDamage();
        }
        // damage increases that require a specific type of debuff
        if (target.hasBuffType("Movement", true))
            totalBuffs += attacker.getSlowedDamage();
        if (target.hasBuffType("Defense", true))
            totalBuffs += attacker.getDefDownDamage();
        if (effectiveStability == 0)
            totalBuffs += attacker.getExposedDamage();
        if (element == Elements.PHYSICAL) {
            totalBuffs += attacker.getElementDamage(Elements.PHYSICAL);
        }
        else {
            totalBuffs += attacker.getPhaseDamage();
            totalBuffs += attacker.getElementDamage(element);
        }
        // make sure that totalbuffs doesn't become negative
        totalBuffs = Math.max(0, totalBuffs);
        console.log([target, attacker, baseDamage, defModifier, coverModifier, critModifier, weaknessModifier, totalBuffs]);
        // damage has a minimum value of 1
        let damage = Math.max(baseDamage * defModifier * critModifier * weaknessModifier * totalBuffs * coverModifier, 1);
        // round resulting damage
        damage = Math.round(damage);
        // if no phase weakness was exploited, reduce stability after damage dealt
        if (weaknessModifier == 1)
            target.reduceStability(totalStabDamage);
        // inform the target that it has been "hit" and reduce the counters of any buffs that last for a number of hits rather than turns
        target.takeDamage();
        EventManager.getInstance().broadcastEvent("damageDealt", [attacker, target, damage, element, target.getStability(), isCrit]);
        // alert any listeners that damage of this type triggers effects on
        EventManager.getInstance().broadcastEvent("damageDealtTypes", [attacker.getName(), skillName, element, ammoType, damageType, damage]);
        return damage;
    }
    // will pass the damage to an event observer manager later
    applyFixedDamage(damage, sourceName) {
        let target = GameStateManager.getInstance().getTarget();
        target.takeDamage();
        damage = Math.max(damage,1);
        EventManager.getInstance().broadcastEvent("fixedDamage", [sourceName, target, damage, target.getStability()]);
    }
}

export default DamageManager;