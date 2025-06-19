import GameStateManager from "./GameStateManager.js";
import EventManager from "./EventManager.js";
import {AttackTypes, Elements, AmmoTypes, WeaponJSONKeys, SkillNames, BuffJSONKeys, StatVariants} from "./Enums.js";
import GlobalBuffManager from "./GlobalBuffManager.js";

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
        let exploitedElement = false;
        target.getPhaseWeaknesses().forEach(d => {
            if (d == ammoType)
                weaknesses++;
            else if (d == element) {
                weaknesses++;
                exploitedElement = true;
            }
        });
        // stability modifier buffs on the target or doll, minimum of 0 before phase weakness adds 2 per weakness
        let totalStabDamage = stabilityDamage + target.getStabilityTakenModifier(StatVariants.ALL) + attacker.getStabilityDamageModifier(StatVariants.ALL);
        // flammable increases burn stability damage by 2 and gets consumed when it triggers
        //if (target.hasBuff("Flammable") && element == Elements.BURN)
        //    totalStabDamage += 2;
        
        if (weaknesses > 0) {
            // apply gun effect for exploiting phase weakness, if element was not exploited use physical as a placeholder to avoid incorrect behavior
            attacker.applyGunEffects(WeaponJSONKeys.PHASE_EXPLOIT, exploitedElement ? element : Elements.PHYSICAL);
        }
        // targeted and aoe def ignore buffs are not automatically added so add their specific buff effects here
        /*if (damageType == AttackTypes.TARGETED) {
            /*if (attacker.hasBuff("Piercing 1"))
                totalDefIgnore += 0.2;
            else if (attacker.hasBuff("Piercing 2"))
                totalDefIgnore += 0.3;
            
        }
        else {
            if (attacker.hasBuff("Domain Penetration 1"))
                totalDefIgnore += 0.2;
            else if (attacker.hasBuff("Domain Penetration 2"))
                totalDefIgnore += 0.3;
            
        }*/

        
        // there are a lot of damage dealt/taken effects that are specific to certain conditions
        let totalBuffs = 1;
        let totalDefIgnore = attacker.getDefenseIgnore(StatVariants.ALL);
        {
        totalBuffs += target.getDamageTaken(StatVariants.ALL);
        totalBuffs += attacker.getDamageDealt(StatVariants.ALL);
        totalBuffs += GlobalBuffManager.getInstance().getGlobalDamage();
        // check if the target has elemental debuffs
        let elements = Object.values(Elements);
        let hasElementalDebuff = false;
        // check if the attacker has phase strike and add the damage if any elemental debuff is found
        if (attacker.getPhaseStrike()) {
            for (let i = 0; i < elements.length && !hasElementalDebuff ; i++) {
                if (target.hasBuffElement(elements[i], true)) {
                    hasElementalDebuff = true; 
                    totalBuffs += 0.15;
                }
            }
        }
        if (damageType == AttackTypes.TARGETED) {
            totalBuffs += target.getDamageTaken(StatVariants.TARGETED);
            totalBuffs += attacker.getDamageDealt(StatVariants.TARGETED);
            totalBuffs += GlobalBuffManager.getInstance().getGlobalTargetedDamage();
            totalDefIgnore += attacker.getDefenseIgnore(StatVariants.TARGETED);
            totalStabDamage += attacker.getStabilityDamageModifier(StatVariants.TARGETED);
            totalStabDamage += target.getStabilityTakenModifier(StatVariants.TARGETED);
        }
        else {
            totalBuffs += target.getDamageTaken(StatVariants.AOE);
            totalBuffs += attacker.getDamageDealt(StatVariants.AOE);
            totalBuffs += GlobalBuffManager.getInstance().getGlobalAoEDamage();
            totalDefIgnore += attacker.getDefenseIgnore(StatVariants.AOE);
            totalStabDamage += attacker.getStabilityDamageModifier(StatVariants.AOE);
            totalStabDamage += target.getStabilityTakenModifier(StatVariants.AOE);
        }
        // damage increases that require a specific type of debuff
        if (target.hasBuffType("Movement", true))
            totalBuffs += attacker.getSlowedDamage();
        if (target.hasBuffType("Defense", true))
            totalBuffs += attacker.getDefDownDamage();
        if (element == Elements.PHYSICAL) {
            totalBuffs += target.getDamageTaken(StatVariants.PHYSICAL);
            totalBuffs += attacker.getDamageDealt(StatVariants.PHYSICAL);
            totalBuffs += GlobalBuffManager.getInstance().getGlobalElementalDamage(Elements.PHYSICAL);
            totalDefIgnore += attacker.getDefenseIgnore(StatVariants.PHYSICAL);
            totalStabDamage += attacker.getStabilityDamageModifier(StatVariants.PHYSICAL);
            totalStabDamage += target.getStabilityTakenModifier(StatVariants.PHYSICAL);
        }
        else {
            totalBuffs += target.getDamageTaken(StatVariants.PHASE);
            totalBuffs += attacker.getDamageDealt(StatVariants.PHASE);
            totalBuffs += target.getDamageTaken(element);
            totalBuffs += attacker.getDamageDealt(element);
            totalBuffs += GlobalBuffManager.getInstance().getGlobalElementalDamage(element);
            totalDefIgnore += attacker.getDefenseIgnore(StatVariants.PHASE);
            totalStabDamage += attacker.getStabilityDamageModifier(StatVariants.PHASE);
            totalStabDamage += target.getStabilityTakenModifier(StatVariants.PHASE);
            totalDefIgnore += attacker.getDefenseIgnore(element);
            totalStabDamage += attacker.getStabilityDamageModifier(element);
            totalStabDamage += target.getStabilityTakenModifier(element);
        }
        }

        let critModifier = isCrit ? critDamage : 1;
        // ensure that stability damage before accounting for weaknesses has a minimum value of 0
        totalStabDamage = Math.max(totalStabDamage, 0);
        // add in the stability damage from weakness
        totalStabDamage += weaknesses * 2;
        if (weaknesses > 0) {
            // if any phase weakness is exploited, stability damage happens before the attack rather than after
            target.reduceStability(totalStabDamage);
        }
        let coverValue = GameStateManager.getInstance().getCover();
        // apply gun effect for attacking out of cover target if value is 0
        if (coverValue == 0)
            attacker.applyGunEffects(WeaponJSONKeys.OUT_OF_COVER);
        // some dolls ignore a set amount of stability
        let effectiveStability = Math.max(target.getStability() - attacker.getStabilityIgnore(),0);
        let coverModifier = 1 - Math.max(coverValue - coverIgnore - attacker.getCoverIgnore(), 0) - 
                                                                (effectiveStability > 0 && !(damageType == AttackTypes.AOE || ammoType == AmmoTypes.MELEE) ? 0.6 : 0);

        if (effectiveStability == 0)
            totalBuffs += attacker.getExposedDamage();
        else { // if there is remaining stability, apply stability based damage reduction
            totalBuffs -= target.getDRPerStab() * effectiveStability;
            totalBuffs -= target.getDRWithStab();
        }
        // check if weapon buffs that conditionally increase damage are present
        let conditionalWeapons = [/Eulogistic Verse/, /Mourning Whisper/, /Dazzling Sparkles/, /Resonator/, /Bittersweet Caramel/]
        attacker.getBuffs().forEach(buff => {
            // check for eulogistic verse, check if freeze debuff is present, check if frigid is present, calculate multiplier from calibration, otherwise do nothing
            if (conditionalWeapons[0].test(buff[0])) {
                if (target.hasBuffElement(Elements.FREEZE, true)) {
                    // if frigid is present, double the damage buff from eulogistic verse
                    let scale = 1;
                    if (target.hasBuff("Frigid"))
                        scale = 2;
                    // get the calibration level to determine the damage buff scaling from 5-10% in 1% intervals
                    let calib = +buff[0].slice(-1);
                    totalBuffs += (0.04 + calib * 0.01) * scale;
                }
            }
            // check for mourning whisper, check if burn debuff is present, check if burn damage is dealt, calculate multiplier from calibration, otherwise do nothing
            // separately check if overheat combustion is present, check if damage dealt is targeted
            else if (conditionalWeapons[1].test(buff[0])) {
                if (target.hasBuffElement(Elements.BURN, true)) {
                    // if burn damage is dealt, double the damage buff from mourning whisper
                    let scale = 1;
                    if (element == Elements.BURN)
                        scale = 2;
                    // get the calibration level to determine the damage buff scaling from 10-20% in 2% intervals
                    let calib = +buff[0].slice(-1);
                    totalBuffs += (0.08 + calib * 0.02) * scale;
                }
                // overheat combustion damage buff is separate from the damage buff on attacking burning targets
                if (target.hasBuff("Overheat Combustion") && damageType == AttackTypes.TARGETED)
                    totalBuffs += 0.05;
            }
            // dazzling sparkles grants active physical attacks 4% def ignore per stack
            else if (conditionalWeapons[2].test(buff[0])) {
                if (element == Elements.PHYSICAL && [SkillNames.BASIC, SkillNames.SKILL2, SkillNames.SKILL3, SkillNames.ULT].includes(skillName))
                    totalDefIgnore += 0.04 * buff[3];
            }
            // Resonator at max stacks gives a damage buff to active attacks with an additional bonus to aoe skills
            else if (conditionalWeapons[3].test(buff[0])) {
                if (buff[3] == buff[1][BuffJSONKeys.STACK_LIMIT] && [SkillNames.BASIC, SkillNames.SKILL2, SkillNames.SKILL3, SkillNames.ULT].includes(skillName)) {
                    let calib = +buff[0].slice(-1);
                    if (calib == 1)
                        totalBuffs += 0.1;
                    else if (calib == 2)
                        totalBuffs += 0.15;
                    else
                        totalBuffs += 0.2;
                    // the scaling of the bonus on aoe skills is different from the base damage buff
                    if (damageType == AttackTypes.AOE) {
                        if (calib < 4)
                            totalBuffs += 0.1;
                        else if (calib == 4)
                            totalBuffs += 0.15;
                        else
                            totalBuffs += 0.2;
                    }
                    // consume buff after attack
                    attacker.removeBuff(buff[0]);
                }
            }
            // Resonator at max stacks gives a damage buff to active attacks with an additional bonus to aoe skills
            else if (conditionalWeapons[4].test(buff[0])) {
                if (buff[3] == buff[1][BuffJSONKeys.STACK_LIMIT] && [SkillNames.BASIC, SkillNames.SKILL2, SkillNames.SKILL3, SkillNames.ULT].includes(skillName)) {
                    let calib = +buff[0].slice(-1);
                    // bonus damage scales from 10-20% in 2% intervals
                    totalBuffs += 0.08 + calib * 0.02;
                    // consume buff after attack
                    attacker.removeBuff(buff[0]);
                }
            }
        }); 

        let defenseBuffs = Math.max(0, 1 + target.getDefenseBuffs() - totalDefIgnore);
        let defModifier = attacker.getAttack() / (attacker.getAttack() + target.getBaseDefense() * defenseBuffs);
        let weaknessModifier = 1 + weaknesses * 0.1;
        // make sure that totalbuffs doesn't become negative
        totalBuffs = Math.max(0, totalBuffs);

        console.log([target, attacker, baseDamage, defModifier, coverModifier, critModifier, weaknessModifier, totalBuffs]);
        // damage has a minimum value of 1
        let damage = Math.max(baseDamage * defModifier * critModifier * weaknessModifier * totalBuffs * coverModifier, 1);
        // round resulting damage
        damage = Math.round(damage);
        // if no phase weakness was exploited, reduce stability after damage dealt
        if (weaknesses == 0)
            target.reduceStability(totalStabDamage);

        // undo any temporary buff effects from the attacker weapon
        if (coverValue == 0)
            attacker.removeGunEffects(WeaponJSONKeys.OUT_OF_COVER);
        if (weaknesses > 0)
            attacker.removeGunEffects(WeaponJSONKeys.PHASE_EXPLOIT, exploitedElement ? element : Elements.PHYSICAL);
        // inform the target that it has been "hit" and reduce the counters of any buffs that last for a number of hits rather than turns
        target.takeDamage(element, attacker.getName());
        EventManager.getInstance().broadcastEvent("damageDealt", [attacker, target, damage, element, target.getStability(), isCrit]);
        // alert any listeners that damage of this type triggers effects on
        EventManager.getInstance().broadcastEvent("damageDealtTypes", [attacker.getName(), skillName, element, ammoType, damageType, damage, isCrit]);
        // if attacker has scylla and did corrosive damage, apply 1 stack of the passive
        if (attacker.getWeaponName() == "Scylla" && element == Elements.CORROSION)
            attacker.applyGunBuffs();
        // if attacker has optical illusion, apply 1 stack of the passive after attacking
        if (attacker.getWeaponName() == "Optical Illusion")
            attacker.applyGunBuffs();
        // if skill was a support attack, check if anyone has svarog and apply the passive buff
        if (skillName == SkillNames.SUPPORT) {
            let dolls = GameStateManager.getInstance().getAllDolls();
            dolls.forEach(doll => {
                if (doll.getWeaponName() == "Svarog")
                    doll.applyGunBuffs();
            });
        }

        return damage;
    }
    // will pass the damage to an event observer manager later
    applyFixedDamage(damage, sourceName) {
        let target = GameStateManager.getInstance().getTarget();
        target.takeDamage("", sourceName);
        damage = Math.max(damage,1);
        EventManager.getInstance().broadcastEvent("fixedDamage", [sourceName, target, damage, target.getStability()]);
    }
}

export default DamageManager;