import DamageManager from "./DamageManager.js";
import Doll from "./Doll.js";
import { AmmoTypes, Elements, SkillNames, CalculationTypes, SkillJSONKeys } from "./Enums.js";
import EventManager from "./EventManager.js";
import GameStateManager from "./GameStateManager.js";
import RNGManager from "./RNGManager.js";
import TurnManager from "./TurnManager.js";

class Supporter extends Doll {
    constructor(name, defense, attack, crit_chance, crit_damage, fortification, supportLimit, keysEnabled) {
        super(name, defense, attack, crit_chance, crit_damage, fortification, keysEnabled);

        this.supportLimit = supportLimit;
        this.supportsUsed = 0;
        // not all supporters can use their support skills immediately, some can only do it with certain buffs
        this.supportEnabled = false;
    }

    useSupportSkill(target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = false) {
        if (this.supportsUsed < this.supportLimit && this.supportEnabled) {
            this.supportsUsed++;
            return this.getSkillDamage(SkillNames.SUPPORT, target, calculationType, conditionalTriggered);
        }
        return 0;
    }

    refreshSupportUses() {
        this.supportsUsed = 0;
    }
}

class Interceptor extends Doll {
    constructor(name, defense, attack, crit_chance, crit_damage, fortification, interceptLimit, keysEnabled) {
        super(name, defense, attack, crit_chance, crit_damage, fortification, keysEnabled);

        this.interceptLimit = interceptLimit;
        this.interceptsUsed = 0;
        // most interceptor dolls need certain buffs to use it
        this.interceptEnabled = false;
    }

    useSupportSkill(target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = false) {
        if (this.interceptsUsed < this.interceptLimit && this.interceptEnabled) {
            this.interceptsUsed++;
            return this.getSkillDamage(SkillNames.INTERCEPT, target, calculationType, conditionalTriggered);
        }
        return 0;
    }

    refreshSupportUses() {
        this.interceptsUsed = 0;
    }
}

export class Qiongjiu extends Supporter {
    constructor(defense, attack, crit_chance, crit_damage, fortification, keysEnabled) {
        super("Qiongjiu", defense, attack, crit_chance, crit_damage, fortification, 3, keysEnabled);

        this.supportEnabled = true;

        if (this.fortification > 2)
            this.supportDamageDealt += 0.1; // V3 10% support damage
        if (this.keysEnabled[0]) // first key gives full starting index 
            this.CIndex = 6;
    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        // qj gets 1 index whenever she attacks
        if (skillName != SkillNames.ULT && this.CIndex < 6)
            this.CIndex++;
        // qj skill2 key condition is at least one phase exploit
        if (skillName == SkillNames.SKILL2 && this.keysEnabled[4]) {
            let weaknesses = target.getPhaseWeaknesses();
            if (weaknesses.includes(Elements.BURN) || weaknesses.includes(AmmoTypes.MEDIUM)) {
                // v1 qj adds another conditional to the skill
                if (this.fortification == 0)
                    conditionalTriggered[0] = true;
                else
                    conditionalTriggered[1] = true;
            }
        }
        // v2+ qj skill3 has a conditional if the target is burning
        if (skillName == SkillNames.SKILL3) {
            if (target.hasBuff("Overburn"))
                conditionalTriggered[0] = true;
        }
        // qj ult has a conditional at max index
        if (skillName == SkillNames.ULT && this.CIndex == 6) {
            conditionalTriggered[0] = true;
            // rather than temporarily increasing max support by 1 and tracking that, I would rather just reduce the used counter by 1 even if it goes negative
            this.supportsUsed--;
        }
        // if the target is out of cover, qj deals extra damage, enhanced by v6
        if (GameStateManager.getInstance().getCover() == 0) {
            this.damageDealt += 0.1;
            if (this.fortification == 6)
                this.damageDealt += 0.1;
        }
        
        let damage = super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);

        if (GameStateManager.getInstance().getCover() == 0) {
            this.damageDealt -= 0.1;
            if (this.fortification == 6)
                this.damageDealt -= 0.1;
        }

        return damage;
    }

    useSupportSkill(target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = false) {
        if (this.supportsUsed < this.supportLimit && this.supportEnabled) {
            this.supportsUsed++;
            let damage = this.getSkillDamage(SkillNames.SUPPORT, target, calculationType, conditionalTriggered);
            // V4 vuln application requires her to have support boost 2 stacks and the target to be out of cover
            if (this.hasBuff("Support Boost 2 V4") && GameStateManager.getInstance().getCover() == 0)
                target[0].addBuff("Vulnerability 1", this.name, 1, 1);
            return damage;
        }
        return 0;
    }

    usePriorityDebuff(target, ally) {
        if (this.keysEnabled[2]) {
            target.addBuff("Defense Down 2", this.name, 1, 1);
            console.log("Applying debuff");
        }
        if (this.fortification > 4) {
            ally.addBuff("Damage Up 2", this.name, 1, 1);
        }
    }

    cloneUnit() {
        return super.cloneUnit(new Qiongjiu(this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled));
    }
}

export class Makiatto extends Interceptor {
    constructor(defense, attack, crit_chance, crit_damage, fortification, keysEnabled) {
        super("Makiatto", defense, attack, crit_chance, crit_damage, fortification, 2, keysEnabled);

        this.interceptEnabled = false;
        // fortifications increase intercept limit during ult duration
        if (this.fortification == 6)
            this.interceptLimit = 4;
        else if (this.fortification > 1)
            this.interceptLimit = 3;
        if (keysEnabled[1]) // key 2 starts full index
            this.CIndex = 6;
        if (keysEnabled[4]) // key 5 applies murderous intent on the  highest hp enemy, sim is meant for single target
            GameStateManager.getInstance().getTarget().addBuff("Murderous Intent", this.name, -1, 1);
        if (keysEnabled[5])
            this.attackBuff += 0.1;
        // Makiatto passive
        this.crit_chance += 0.4;
        this.crit_damage -= 0.1;
        this.addBuff("Insight", this.name, 2, 1);
        this.addBuff("Steady Progress", this.name, 2, 1);
    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        // temporary stability and damage boost from passive on specific targets
        if (target.constructor != Array) {
            if (target.hasBuff("Frigid")) {
                // check if freeze damage
                if ((skillName == SkillNames.INTERCEPT || skillName == SkillNames.SKILL2) && this.fortification > 2) {
                    this.stabilityIgnore += 10;
                    this.damageDealt += 0.3;
                }
                else {
                    this.stabilityIgnore += 6;
                    this.damageDealt += 0.3;
                }
            }
            else if (target.hasBuff("Frozen")) {
                // check if freeze damage
                if (skillName == SkillNames.INTERCEPT || skillName == SkillNames.SKILL2) {
                    if (this.fortification > 4) {
                        this.stabilityIgnore += 10;
                        this.damageDealt += 0.3;
                    }
                    else if (this.fortification > 2) {
                        this.stabilityIgnore += 6;
                        this.damageDealt += 0.2;
                    }
                    else {
                        this.stabilityIgnore += 4;
                        this.damageDealt += 0.2;
                    }
                }
                else {
                    this.stabilityIgnore += 4;
                    this.damageDealt += 0.2;
                }
            }
            else if (target.hasBuff("Murderous Intent")) {
                // murderous intent replaces the passive on the highest hp target but only works on freeze damage and does not work on non-freeze damage
                if (skillName == SkillNames.INTERCEPT || skillName == SkillNames.SKILL2) {
                    let weaknesses = target.getPhaseWeaknesses();
                    if (weaknesses.includes(Elements.FREEZE) || weaknesses.includes(AmmoTypes.HEAVY)) 
                        this.damageDealt += 0.3;
                    else
                        this.damageDealt += 0.2;
                }
            }
        }
        // v1+ skill 2 and v6 intercept conditional is the first attack critting, that assumption is handled by all except simulation inside the doll class
        if (!conditionalTriggered[0] && calculationType == CalculationTypes.SIMULATION) {
            // do a crit roll outside of the proper function, if it crits then set the onCrit condition to true regardless of the toggle input
            if ((skillName == SkillNames.SKILL2 && this.fortification > 0) || (skillName == SkillNames.INTERCEPT && this.fortification == 6))
                conditionalTriggered[0] = RNGManager.getInstance().getRNG() <= this.crit_chance;
        }
        
        let damage = super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);
        // undo temporary damage buffs
        if (target.constructor != Array) {
            if (target.hasBuff("Frigid")) {
                // check if freeze damage
                if ((skillName == SkillNames.INTERCEPT || skillName == SkillNames.SKILL2) && this.fortification > 2) {
                    this.stabilityIgnore -= 10;
                    this.damageDealt -= 0.3;
                }
                else {
                    this.stabilityIgnore -= 6;
                    this.damageDealt -= 0.3;
                }
            }
            else if (target.hasBuff("Frozen")) {
                // check if freeze damage
                if (skillName == SkillNames.INTERCEPT || skillName == SkillNames.SKILL2) {
                    if (this.fortification > 4) {
                        this.stabilityIgnore -= 10;
                        this.damageDealt -= 0.3;
                    }
                    else if (this.fortification > 2) {
                        this.stabilityIgnore -= 6;
                        this.damageDealt -= 0.2;
                    }
                    else {
                        this.stabilityIgnore -= 4;
                        this.damageDealt -= 0.2;
                    }
                }
                else {
                    this.stabilityIgnore -= 4;
                    this.damageDealt -= 0.2;
                }
            }
            else if (target.hasBuff("Murderous Intent")) {
                // murderous intent replaces the passive on the highest hp target but only works on freeze damage and does not work on non-freeze damage
                if (skillName == SkillNames.INTERCEPT || skillName == SkillNames.SKILL2) {
                    let weaknesses = target.getPhaseWeaknesses();
                    if (weaknesses.includes(Elements.FREEZE) || weaknesses.includes(AmmoTypes.HEAVY)) 
                        this.damageDealt -= 0.3;
                    else
                        this.damageDealt -= 0.2;
                }
            }
        }
        // index recovery of skills
        if (skillName == SkillNames.SKILL2) {
            // key 1 conditional refunds 1 index on kill
            if (this.keysEnabled[0]) {
                if (conditionalTriggered[1])
                    this.CIndex++;
            }
        }
        else if (skillName == SkillNames.SKILL3)
            this.CIndex = Math.min(this.CIndex + 4, 6);
        // v6 makiatto regens 2 index per turn while ult is active
        if (this.hasBuff("Alert") && this.fortification == 6)
            this.CIndex = Math.min(this.CIndex + 2, 6);

        return damage;
    }

    addBuff(buffName, duration, source) {
        super.addBuff(buffName, duration, source);
        if (buffName == "Alert") // ult buff enables intercept as long as frost barrier is up, the shield should never be broken so that is not checked
            this.interceptEnabled = true;
    }
    removeBuff(buffName) {
        super.removeBuff(buffName);
        if (buffName == "Alert")
            this.interceptEnabled = false;
    }
    
    endTurn() {
        super.endTurn();
        // Passive constantly refreshes these buffs as long as 80%+ hp which is assumed always true
        this.addBuff("Insight", this.name, 2, 1);
        this.addBuff("Steady Progress", this.name, 2, 1);
    }

    cloneUnit() {
        return super.cloneUnit(new Makiatto(this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled));
    }
}

export class Suomi extends Supporter {
    constructor(defense, attack, crit_chance, crit_damage, fortification, keysEnabled) {
        super("Suomi", defense, attack, crit_chance, crit_damage, fortification, 2, keysEnabled);

        this.supportEnabled = true;
        // 2nd key starts with full index
        if (this.keysEnabled[1]) 
            this.CIndex = 6;
        // v5+ suomi has 1 additional support limit
        if (this.fortification > 4)
            this.supportLimit = 3;
    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        // handle ult solely within this function
        if (skillName != SkillNames.ULT) {
            // v4+ skill2 conditional is if this hit brings positive stability down to 0
            if (skillName == SkillNames.SKILL2 && this.fortification > 3 && target.getStability() > 0) {
                let weaknesses = 0;
                target.getPhaseWeaknesses().forEach(d => {
                if (d == Elements.FREEZE || d == AmmoTypes.LIGHT)
                    weaknesses++;
                });
                let totalStabDamage = Math.max(0, 4 + target.getStabilityDamageModifier() + this.getStabilityDamageModifier());
                totalStabDamage += weaknesses * 2;
                if (totalStabDamage > target.getStability())
                    conditionalTriggered[0] = true;
            }
            // v3+ skill3 grants an extra stack of defensive support if near a large target
            if (skillName == SkillNames.SKILL3) {
                if (this.fortification > 2 && target.getIsLarge()) 
                    conditionalTriggered[0] = true;
            }

            super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);
            // key 3 gives skill3 an index refund if target is below 80% hp
            if (skillName == SkillNames.SKILL3) {
                if (this.keysEnabled[2])
                    if (conditionalTriggered[1]) 
                        this.CIndex++;
            }
        }
        else {
            let skill = this.copyNestedObject(this.skillData[skillName]);
            // ult condition is full hp before ulting
            if (skill.hasOwnProperty(SkillJSONKeys.CONDITIONAL)) {
                conditionalTriggered.forEach((flag, index) => {
                    if (flag) {
                        let conditionalData = skill[SkillJSONKeys.CONDITIONAL][index];
                        this.mergeData(skill, conditionalData);
                    }
                });
            }
            // deal fixed damage
            let fixedDamage = 0;
            if (skill.hasOwnProperty(SkillJSONKeys.FIXED_DAMAGE)) {
                let data = skill[SkillJSONKeys.FIXED_DAMAGE];
                switch (data[SkillJSONKeys.FIXED_DAMAGE_STAT]) {
                    case "Defense":
                        fixedDamage = this.defense;
                        break;
                    case "Attack":
                        fixedDamage = this.attack;
                        break;
                    default:
                        console.error([`${data[SkillJSONKeys.FIXED_DAMAGE_STAT]} fixed damage scaling for is not covered`, this]);
                }
                fixedDamage = Math.round(data[SkillJSONKeys.FIXED_DAMAGE_SCALING] * fixedDamage);
            }

            this.consumeAttackBuffs();
            DamageManager.getInstance().applyFixedDamage(fixedDamage, this.name);
            // apply avalanche stacks
            if (target) {
                let statusEffects = skill[SkillJSONKeys.POST_TARGET_BUFF];
                statusEffects.forEach(buff => {
                    let stacks = 1;
                    if (buff.hasOwnProperty(SkillJSONKeys.BUFF_STACKS))
                        stacks = buff[SkillJSONKeys.BUFF_STACKS];
                    let duration = -1;
                    if (buff.hasOwnProperty(SkillJSONKeys.BUFF_DURATION))
                        duration = buff[SkillJSONKeys.BUFF_DURATION];
                    target.addBuff(buff[SkillJSONKeys.BUFF_NAME], this.name, duration, stacks);
                });
            }
            // tick down buffs before applying shield to self
            this.endTurn();
            // suomi ult buffs all dolls after dealing damage to the enemy
            GameStateManager.getInstance().getAllDolls().forEach(doll => {
                // because ult affects all dolls and deals damage, I placed the ally buff under self_buff instead of target_buff
                // suomi does end up with 1 extra stack of wintry bastion at v2+ but that is a defensive buff so it doesn't matter
                let statusEffects = skill[SkillJSONKeys.POST_SELF_BUFF];
                statusEffects.forEach(buff => {
                    let stacks = 1;
                    if (buff.hasOwnProperty(SkillJSONKeys.BUFF_STACKS))
                        stacks = buff[SkillJSONKeys.BUFF_STACKS];
                    let duration = -1;
                    if (buff.hasOwnProperty(SkillJSONKeys.BUFF_DURATION))
                        duration = buff[SkillJSONKeys.BUFF_DURATION];
                    doll.addBuff(buff[SkillJSONKeys.BUFF_NAME], this.name, duration, stacks);
                });
            });
            // suomi applies 1 stack of avalanche for any active skill use by anyone other than herself but groza might still be present in the team
            EventManager.getInstance().broadcastEvent("allyAction", this.name);
            // apply the 5 index cost of the ult
            this.CIndex -= skill[SkillJSONKeys.COST];
        }
    }

    endTurn() {
        super.endTurn();
        // passive gives 2 index per end turn
        this.CIndex = Math.min(this.CIndex + 2, 6);
    }
    // apply 1 avalanche stack each time an ally excluding herself uses a skill
    alertAllyEnd(unitName) {
        if (unitName != this.name)
            GameStateManager.getInstance().getTarget().addBuff("Avalanche", this.name, -1, 1);
    }

    cloneUnit() {
        return super.cloneUnit(new Suomi(this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled));
    }
}