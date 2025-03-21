import DamageManager from "./DamageManager.js";
import Doll from "./Doll.js";
import { AmmoTypes, Elements, SkillNames, CalculationTypes, SkillJSONKeys, BuffJSONKeys, AttackTypes } from "./Enums.js";
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

    useSupportSkill(target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
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

    useSupportSkill(target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
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
        if (skillName != SkillNames.ULT)
            this.adjustIndex(1);
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
            // V4 vuln application requires her to have support boost 2 stacks and the target to be out of cover
            if (this.hasBuff("Support Boost 2 V4") && GameStateManager.getInstance().getCover() == 0)
                target[0].addBuff("Vulnerability 1", this.name, 1, 1);
            let damage = this.getSkillDamage(SkillNames.SUPPORT, target, calculationType, conditionalTriggered);
            
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
        if (keysEnabled[5])
            this.attackBuff += 0.1;
        // Makiatto passive
        this.crit_chance += 0.4;
        this.crit_damage -= 0.1;
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
                    this.adjustIndex(1);
            }
        }
        else if (skillName == SkillNames.SKILL3)
            this.adjustIndex(4);
        // v6 makiatto regens 2 index per turn while ult is active
        if (this.hasBuff("Alert") && this.fortification == 6)
            this.adjustIndex(2);

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

    refreshSupportUses() {
        super.refreshSupportUses();
        // key 5 applies murderous intent on the  highest hp enemy, sim is meant for single target
        let target = GameStateManager.getInstance().getBaseTarget();
        if (this.keysEnabled[4] && !target.hasBuff("Murderous Intent")) 
            target.addBuff("Murderous Intent", this.name, -1, 1);
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
                let enemyTarget = GameStateManager.getInstance().getTarget();
                if (this.fortification > 2 && enemyTarget.getIsLarge()) 
                    conditionalTriggered[0] = true;
            }

            super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);
            // key 3 gives skill3 an index refund if target is below 80% hp
            if (skillName == SkillNames.SKILL3) {
                if (this.keysEnabled[2])
                    if (conditionalTriggered[1]) 
                        this.adjustIndex(1);
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
            this.adjustIndex(-skill[SkillJSONKeys.COST]);
        }
    }

    endTurn() {
        super.endTurn();
        // passive gives 2 index per end turn
        this.adjustIndex(2);
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

export class Papasha extends Doll {
    constructor(defense, attack, crit_chance, crit_damage, fortification, keysEnabled) {
        super("Papasha", defense, attack, crit_chance, crit_damage, fortification, keysEnabled);

        if (fortification > 2)
            this.addBuff("Power of Unity", this.name, -1, 3);
    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        let summon = GameStateManager.getInstance().getDoll("Papasha Summon"); 
        if (skillName != SkillNames.SKILL3) {
            // key 1 gives skill 2 damage buff on large targets
            if (this.keysEnabled[0] && skillName == SkillNames.SKILL2 && target.getIsLarge())
                conditionalTriggered[0] = true;
            // ult applies buffs on the summon before papasha attacks but the order does not really matter
            if (skillName == SkillNames.ULT && this.fortification < 6) {
                summon.addBuff("Tenacity to Withstand", this.name, 2, 1);
            }
            // papasha crit increases summon crit by 20% for the next hit and conversely
            let newSimType;
            if (calculationType == CalculationTypes.SIMULATION) {
                if (RNGManager.getInstance().getRNG() <= this.crit_chance) {
                    newSimType = CalculationTypes.CRIT;
                    summon.crit_chance += 0.2;
                }
                else
                    newSimType = CalculationTypes.NOCRIT;
            }
            
            super.getSkillDamage(skillName, target, calculationType == CalculationTypes.SIMULATION ? newSimType : calculationType, conditionalTriggered);
            // papasha gets 1 index per attack by herself or her summon
            this.adjustIndex(1);
            // skill2 adds courage to endure on the summon if v1 or the target has stability after the nade, does not matter if the following support attack breaks it
            if (skillName == SkillNames.SKILL2) {
                if (this.fortification > 0 || target.getStability() > 0)
                    summon.addBuff("Courage to Endure", this.name, 3, 1);
            }
            // after papasha attack, use summon support, if she used skill2 with key 1, temporarily increase stability damage by 2 regardless of target size
            if (this.keysEnabled[0] && skillName == SkillNames.SKILL2)
                summon.setStabilityDamageModifier(summon.getBaseStabilityDamageModifier() + 2);

            summon.getSkillDamage(SkillNames.SUPPORT, target, calculationType, conditionalTriggered);

            if (this.keysEnabled[0] && skillName == SkillNames.SKILL2)
                summon.setStabilityDamageModifier(summon.getBaseStabilityDamageModifier() - 2);
            // undo the temporary crit chance too
            if (calculationType == CalculationTypes.SIMULATION)
                summon.crit_chance -= 0.2;
        }
        else {
            summon.getSkillDamage(SkillNames.SKILL3, target, calculationType, conditionalTriggered);
        }
        // summon buff durations are timed with papasha end turn
        summon.endTurn();
    }

    refreshSupportUses() {
        super.refreshSupportUses();
        if (this.keysEnabled[5]) {
            let summon = GameStateManager.getInstance().getDoll("Papasha Summon");
            if (this.getAttack() > summon.getAttack())
                summon.addBuff("Accolades Brilliance", this.name, 1, 1);
            else
                this.addBuff("Accolades Brilliance", this.name, 1, 1);
        }
    }

    endTurn() {
        super.endTurn();
        if (this.fortification > 2) {
            this.addBuff("Power of Unity", this.name, -1, 1);
        }
    }

    cloneUnit() {
        return super.cloneUnit(new Papasha(this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled));
    }
}

export class PapashaSummon extends Doll {
    constructor(defense, attack, crit_chance, crit_damage, fortification, keysEnabled) {
        super("Papasha Summon", defense, attack, crit_chance, crit_damage, fortification, keysEnabled);

        // the summon inherits all of papasha's basic stats except crit which are locked to the base values outside of buffs
        if (fortification < 3) {
            this.crit_chance = 0.2;
            this.crit_damage = 1.2;
        }
        else {
            this.crit_chance = 0.5;
            this.crit_damage = 1.4;
            this.addBuff("Power of Unity", this.name, -1, 3);
        }
        if (keysEnabled[2])
            this.attackBoost += 0.1;
    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        // papasha skill3 is used entirely by the summon with its stats and buffs, it also does extra damage if the target is large 
        if (skillName == SkillNames.SKILL3 && target.getIsLarge())
            conditionalTriggered[0] = true; 
        // if v1+ with courage to endure, ignore 30% def of large targets
        if (skillName == SkillNames.SUPPORT && this.hasBuff("Courage to Endure") && target.getIsLarge()) {
            this.defenseIgnore += 0.3;
        }
        let ppsh = GameStateManager.getInstance().getDoll("Papasha");

        super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);
        // summon also grants papasha 1 index per attack
        ppsh.adjustIndex(1);

        if (skillName == SkillNames.SUPPORT && this.hasBuff("Courage to Endure") && target.getIsLarge()) {
            this.defenseIgnore -= 0.3;
        }
        // v2+ papasha has the summon do a support attack after skill3 instead of no support
        if (skillName == SkillNames.SKILL3 && this.fortification > 1) {
            this.getSkillDamage(SkillNames.SUPPORT, target, calculationType, conditionalTriggered);
            ppsh.adjustIndex(1);
        }
    }

    endTurn() {
        super.endTurn();
        if (this.fortification > 2) {
            this.addBuff("Power of Unity", this.name, -1, 1);
        }
    }

    cloneUnit() {
        return super.cloneUnit(new PapashaSummon(this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled));
    }
}

export class Daiyan extends Interceptor {
    constructor(defense, attack, crit_chance, crit_damage, fortification, keysEnabled) {
        super("Daiyan", defense, attack, crit_chance, crit_damage, fortification, 1, keysEnabled);

        this.interceptEnabled = false;
        // key 2 starts with full index
        if (keysEnabled[1])
            this.CIndex = 6;
    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        // key 4 is assumed always true
        if (this.keysEnabled[3])
            this.addBuff("Tuning", this.name, -1, 1);

        let totalTuning = 0;
        let permaTuning = 0;
        for (let i = 0; i < this.currentBuffs.length; i++) {
            if (this.currentBuffs[i][0].match("Tuning"))
                totalTuning += this.currentBuffs[i][3];
            if (this.currentBuffs[i][0] == "Permanent Tuning V3")
                permaTuning += this.currentBuffs[i][3];
        }
        // passive gives 20% damage buff when more than 3 tuning
        if (totalTuning > 3)
            this.damageDealt += 0.2;
        // v4+ passive gives another 20% at more than 5 stacks and upgrades her intercept
        if (totalTuning > 5 && this.fortification > 3) {
            this.damageDealt += 0.2;
            if (skillName == SkillNames.INTERCEPT)
                conditionalTriggered[0] = true;
        }
        // v5+ passive gets 15% cover ignore on exposed enemies at max permanent tuning stacks
        if (this.fortification > 4 && permaTuning == 6 && target.getStability() == 0)
            this.coverIgnore += 0.15;
        // v1+ skill2 condition is no cleanseable buffs on the target
        if (skillName == SkillNames.SKILL2) {
            if (this.fortification > 0) {
                let buffs = target.getBuffs();
                let cleanseableBuffs = 0;
                for (let i = 0; i < buffs.length && !cleanseableBuffs; i++) {
                    if (buffs[i][1][BuffJSONKeys.CLEANSEABLE])
                        cleanseableBuffs = 1;
                }
                if (!cleanseableBuffs)
                    conditionalTriggered[0] = true;
            }
            // key 5 adds 1 stack of cleanse per 3 tuning stacks
            if (this.keysEnabled[4] && totalTuning >= 3)
                target.addBuff("Cleanse", this.name, -1, Math.floor(totalTuning / 3));
        }

        super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);
        // ult reduces 1 turn cd per tuning stack before the attack
        if (skillName == SkillNames.ULT)
            this.cooldowns[3] -= totalTuning;
        // undo temporary buffs
        if (totalTuning > 3)
            this.damageDealt -= 0.2;
        if (totalTuning > 5 && this.fortification > 3) 
            this.damageDealt -= 0.2;
        if (this.fortification > 4 && permaTuning == 6 && target.getStability() == 0)
            this.coverIgnore -= 0.15;
        // passive gives 1 index if attacking an out of cover target
        if (GameStateManager.getInstance().getCover() == 0)
            this.adjustIndex(1);
    }

    refreshSupportUses() {
        super.refreshSupportUses();
        // passive gives 1 stack of tuning and index at the start of each turn
        this.addBuff("Tuning", this.name, -1, 1);
        this.adjustIndex(1);
    }

    removeBuff(buffName) {
        super.removeBuff(buffName);
        // check if tuning stacks were removed and if it has fallen below 2 stacks, disable intercept
        if (buffName.match("Tuning")) {
            let totalTuning = 0;
            for (let i = 0; i < this.currentBuffs.length; i++) {
                if (this.currentBuffs[i][0].match("Tuning"))
                    totalTuning += this.currentBuffs[i][3];
            }
            if (totalTuning <= 2)
                this.interceptEnabled = false;
        }
    }
    addBuff(buffName, sourceName, duration = -1, stacks = 1) {
        super.addBuff(buffName, sourceName, duration, stacks);
        // add up total tuning stacks, if 2+ stacks, enable intercept
        let totalTuning = 0;
        for (let i = 0; i < this.currentBuffs.length; i++) {
            if (this.currentBuffs[i][0].match("Tuning"))
                totalTuning += this.currentBuffs[i][3];
        }
        if (totalTuning > 2)
            this.interceptEnabled = true;
    }

    cloneUnit() {
        return super.cloneUnit(new Daiyan(this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled));
    }
}

export class Tololo extends Doll {
    constructor(defense, attack, crit_chance, crit_damage, fortification, keysEnabled) {
        super("Tololo", defense, attack, crit_chance, crit_damage, fortification, keysEnabled);

        // passively starts with full index
        this.CIndex = 6;
    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        // count number of buffs before attack for conditionals
        let buffCount = 0;
        this.currentBuffs.forEach(buff => {
            if(buff[1][BuffJSONKeys.BUFF_TYPE] == "Buff")
                buffCount++;
        });
        if (buffCount >= 2) {
            // skill3 condition is 2+ buffs
            if (skillName == SkillNames.SKILL3) {
                conditionalTriggered[0] = true;
            }
            if (buffCount >= 3) {
                // v2+ skill3 condition is 3+ buffs compounded on top of the original condition
                if (this.fortification > 1 && skillName == SkillNames.SKILL3)
                    conditionalTriggered[1] = true;
                // ult condition is 3+ buffs
                else if (skillName == SkillNames.ULT)
                    conditionalTriggered[0] = true;
            }
        }
        // count number of weaknesses exploited
        let exploit = 0;
        let weaknesses = target.getPhaseWeaknesses();
        if (skillName == SkillNames.ULT) {
            if (weaknesses.includes(Elements.HYDRO))
                exploit = 1;
        }
        else {
            if (weaknesses.includes(AmmoTypes.MEDIUM)) 
                exploit = 1;
            else if (weaknesses.includes(Elements.HYDRO)) {
                if (skillName == SkillNames.SKILL2)
                    exploit = 1;
                else if (skillName == SkillNames.SKILL3 && this.fortification > 1) {
                    if (conditionalTriggered[1])
                        exploit = 1;
                }
            }
        }
        if (exploit) {
            // key 5 cleanses 2 buffs if exploiting phase weakness
            if (this.keysEnabled[4])
               target.addBuff("Cleanse", this.name, 1, 2);
            // v1+ skill2 conditional is phase exploit
            if (skillName == SkillNames.SKILL2 && this.fortification > 0)
                conditionalTriggered[0] = true;
        }

        super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);

        if (skillName == SkillNames.SKILL2 || skillName == SkillNames.SKILL3) {
            // skill2 and 3 give 2 index if their first condition is met
            if (conditionalTriggered[0])
                this.adjustIndex(2);
            // v2+ skill3 2nd conditional adds another index 
            if (this.fortification > 1 && skillName == SkillNames.SKILL3)
                if (conditionalTriggered[1])
                    this.adjustIndex(1);
        }
        // ult condition also reduces ult cd by 2 or 3 turns depending on fortification
        if (skillName == SkillNames.ULT && conditionalTriggered[0]) {
            if (conditionalTriggered[0]) {
                this.cooldowns[3] -= 2;
                if (this.fortification > 2)
                    this.cooldowns[3]--;
            }
            // v6 ult 2nd condition grants 1 index onkill
            if (this.fortification == 6) 
                if (conditionalTriggered[1])
                    this.adjustIndex(1);
        }

        // passive consumes full index bar to grant extra action after any attack
        if (this.CIndex == 6) {
            this.turnAvailable = true;
            this.CIndex = 0;
            // key 1 grants movement up for 1 turn when triggering passive
            if (this.keysEnabled[0])
                this.addBuff("Movemenet Up 1", this.name, 1, 1);
            // key 3 grants attack up and damage up 2 for 1 turn when triggering passive
            if (this.keysEnabled[2]) {
                this.addBuff("Attack Up 2", this.name, 1, 1);
                this.addBuff("Damage Up 2", this.name, 1, 1);
            }
            // v4 grants extra buffs for 2 turns
            if (this.fortification > 3) {
                this.addBuff("Targeted Attack Boost 2", this.name, 2, 1);
                this.addBuff("Critical Rate Boost 2", this.name, 2, 1);
                this.addBuff("Phase Boost 2", this.name, 2, 1);
                this.addBuff("Piercing 2", this.name, 2, 1);
            }
        }
    }

    checkDamage(element, triggeringDollName) {
        if (element == Elements.HYDRO) {
            if (this.fortification < 5) {
                this.addBuff("Lightspike", this.name, -1, 1);
            }
            else {
                this.addBuff("Lightspike V5", this.name, -1, 1);
            }
        }
    }

    cloneUnit() {
        return super.cloneUnit(new Tololo(this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled));
    }
}

export class MosinNagant extends Supporter {
    constructor(defense, attack, crit_chance, crit_damage, fortification, keysEnabled) {
        super("Mosin-Nagant", defense, attack, crit_chance, crit_damage, fortification, 2, keysEnabled);
        // support is always available but requires specific conditions to be used
        this.supportEnabled = true;
        // track skill3 uses for bonus effects
        this.skill3Uses = 0;
        // v6 gives 3 supports per turn
        if (fortification == 6)
            this.supportLimit = 3;
    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        // 2 of the skill check if a phase weakness is exploited for conditional
        let exploit = 0;
        let weaknesses;
        if (target.constructor == Array)
            weaknesses = target[0].getPhaseWeaknesses();
        else
            weaknesses = target.getPhaseWeaknesses();
        if (this.hasBuff("Active Engagement") || this.hasBuff("Active Engagement V5")) { 
            if (weaknesses.includes(Elements.ELECTRIC))
                exploit = 1;
            // key 2 adds a condition if skill2 does electric damage which is the same as checking if active engagement buff is present
            if (skillName == SkillNames.SKILL2 && this.keysEnabled[1]) {
                // depending on whether v1 added another condition, the index of the key's condition changes
                if (this.fortification == 0)
                    conditionalTriggered[0] = true;
                else
                    conditionalTriggered[1] = true;
            }
        }
        else if (weaknesses.includes(AmmoTypes.HEAVY))
            exploit = 1;
        // check skill3 conditional
        if (skillName == SkillNames.SKILL3) {
            this.skill3Uses++;
            // put it on a 1 turn cooldown to prevent it from being used multiple times on the same turn
            this.cooldowns[2] = 1;
            // if used 3 times, grant shock, v5 lowers the requirement to 2 times
            if (this.skill3Uses == 3 || (this.skill3Uses == 2 && this.fortification > 4)) {
                conditionalTriggered[0] = true;
                this.skill3Uses = 0;
            }
        }
        else if (exploit && (skillName == SkillNames.ULT || (skillName == SkillNames.SKILL2 && this.fortification > 0)))
            conditionalTriggered[0] = true;
        // unshakable confidence only buffs ult crit
        let ultStacks = 0;
        if (skillName == SkillNames.ULT) {
            for (let i = 0; i < this.currentBuffs.length && ultStacks == 0; i++) {
                if (this.currentBuffs[i][0] == "Unshakable Confidence")
                    ultStacks = this.currentBuffs[i][3];
            }
            this.crit_chance += 0.05 * ultStacks;
            this.crit_damage += 0.05 * ultStacks;
        }
        // key 4 gives 15% cover ignore if has shock buff
        let hasShock = this.hasBuff("Shock");
        if (this.keysEnabled[3] && hasShock)
            this.coverIgnore += 0.15;

        super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);

        if (this.keysEnabled[3] && hasShock)
            this.coverIgnore -= 0.15;
        if (skillName == SkillNames.ULT) {
            this.crit_chance -= 0.05 * ultStacks;
            this.crit_damage -= 0.05 * ultStacks;
            // v3+ ult gives 1 index per unshakable confidence stack
            if (this.fortification > 2)
                this.adjustIndex(ultStacks);
        }
        // support gives 2 index per use
        else if (skillName == SkillNames.SUPPORT)
            this.adjustIndex(2);
        // skill2 conditional refunds an index
        else if (skillName == SkillNames.SKILL2 && this.fortification > 0 && conditionalTriggered[0])
            this.adjustIndex(1);
    }

    useSupportSkill(target, calculationType, conditionalTriggered) {
        // mosin support only triggers if the target has no stability after the primary attacker
        if (target[0].getStability() == 0)
            super.useSupportSkill(target, calculationType, conditionalTriggered);
    }
    // trigger wise support on any electric debuff applied by other allies at v6
    checkBuff(element, triggeringDollName) {
        if (element == Elements.ELECTRIC && this.name != triggeringDollName && this.fortification == 6) {
            TurnManager.getInstance().alertPendingSupport(this.name);
        }
    }

    cloneUnit() {
        return super.cloneUnit(new MosinNagant(this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled));
    }
}

export class Vepley extends Doll {
    constructor(defense, attack, crit_chance, crit_damage, fortification, keysEnabled) {
        super("Vepley", defense, attack, crit_chance, crit_damage, fortification, keysEnabled);

        // assume that the enemy always has movement debuff with vepley present so key 1 always happens
        if (keysEnabled[0])
            this.stabilityDamageModifier += 2;
        // passively has 20% damage on targets with movemenet debuffs
        this.slowedDamageDealt += 0.2;
    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        let moveDebuff = target.hasBuffType("Movement", true);
        if (moveDebuff) {
            // skill3 v2 and key 4 have the same condition but they ended up on separate array indices
            if (skillName == SkillNames.SKILL3)
                for (let i = 1; i < conditionalTriggered.length; i++)
                    conditionalTriggered[i] = true;
        }
        // skill3 inherent condition is target is out of cover
        if (GameStateManager.getInstance().getCover() == 0 && skillName == SkillNames.SKILL3)
            conditionalTriggered[0] = true;

        super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);

        // assume only 1 target is ever hit for index regen
        this.adjustIndex(1);
    }

    refreshSupportUses() {
        super.refreshSupportUses();
        this.adjustIndex(1);
    }

    cloneUnit() {
        return super.cloneUnit(new Vepley(this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled));
    }
}

export class Peritya extends Supporter {
    constructor(defense, attack, crit_chance, crit_damage, fortification, keysEnabled) {
        super("Peritya", defense, attack, crit_chance, crit_damage, fortification, 6, keysEnabled);
        // support is always available but requires aoe damage to trigger it
        this.supportEnabled = true;
        // key 5 starts with full index
        if (this.keysEnabled[4])
            this.CIndex = 6;
        // v6 gives 10 support charges
        if (fortification == 6)
            this.supportLimit = 10;
    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        if (this.keysEnabled[3] && target.getIsLarge() && skillName == SkillNames.SKILL3)
            conditionalTriggered[0] = true;
        // assume that peritya always only hits 1 target with all her skills and that she maxes her passive
        if (skillName == SkillNames.ULT) 
            this.damageDealt += 0.05;
        this.damageDealt += 0.3;

        super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);

        this.damageDealt -= 0.3;
        if (skillName == SkillNames.ULT) 
            this.damageDealt -= 0.05;
        if (skillName == SkillNames.SKILL3)
            this.cooldowns[2]--;
        // it is very likely that peritya will have at least 1 step left each turn so always activate key 2 if present
        if (this.keysEnabled[1])
            this.addBuff("Movement Up 2", this.name, 1, 1);
        if (skillName == SkillNames.SUPPORT) {
            this.adjustIndex(1);
        } // if she does not move before attacking gain 2 index at v5+ and is assumed always true in bossing
        else if (this.fortification > 4)
            this.adjustIndex(2);
    }
    // need to listen for an aoe attack to trigger support then inform that a support is pending
    checkDamage(damageType, triggeringDollName) {
        if (damageType == AttackTypes.AOE && triggeringDollName != this.name) {
            TurnManager.getInstance().alertPendingSupport(this.name);
        }
    }

    cloneUnit() {
        return super.cloneUnit(new Peritya(this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled));
    }
}

export class Sharkry extends Supporter {
    constructor(defense, attack, crit_chance, crit_damage, fortification, keysEnabled) {
        super("Sharkry", defense, attack, crit_chance, crit_damage, fortification, 3, keysEnabled);
        // support is activated by equipping key 2
        if (keysEnabled[1])
            this.supportEnabled = true;
        // key 1 starts with full index
        if (this.keysEnabled[0])
            this.CIndex = 6;

    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        let buffs = 0;
        if (target.hasBuff("Overburn")) { 
            if (skillName == SkillNames.SKILL3) {
                conditionalTriggered[0] = true;
                // key 4 adds another skill3 conditional that also requires overburn
                if (this.keysEnabled[3])
                    conditionalTriggered[1] = true;
            }
            // passively gains 20% crit vs overburn targets
            this.crit_chance += 0.2;
            // v4+ adds 10% more crit chance and 3% crit damage per buff
            if (this.fortification > 3) {
                this.crit_chance += 0.1;
                this.currentBuffs.forEach(buff => {
                    if (buff[1][BuffJSONKeys.BUFF_TYPE] == "Buff")
                        buffs++;
                });
                this.crit_damage += Math.min(buffs, 5) * 0.03;
            }
        }

        super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);

        if (target.hasBuff("Overburn")) {
            // passively gains 20% crit vs overburn targets
            this.crit_chance -= 0.2;
            // v4+ adds 10% more crit chance and 3% crit damage per buff
            if (this.fortification > 3) {
                this.crit_chance -= 0.1;
                this.crit_damage -= Math.min(buffs, 5) * 0.03;
            }
        }
        // key 5 conditional grants 1 stack of zoomin on kill but the version of zoom in changes depending on fortification
        if (conditionalTriggered[0] && skillName == SkillNames.SKILL2) {
            if (this.fortification < 5)
                this.addBuff("Zoom In", this.name, 1, 1);
            else
                this.addBuff("Zoom In V5", this.name, 1, 1);
        }
    }
    // need to listen for an aoe attack to trigger support then inform that a support is pending
    checkBuff(buffName, triggeringDollName) {
        if (buffName == "Overburn") {
            TurnManager.getInstance().alertPendingSupport(this.name);
            // adds 1 index whenever overburn is applied
            this.adjustIndex(1);
        }
    }

    refreshSupportUses() {
        super.refreshSupportUses();
        // passively gains 1 index per turn
        this.adjustIndex(1);
        // v6 also gains 1 zoom in stack per turn
        if (this.fortification == 6)
            this.addBuff("Zoom In V5", this.name, -1, 1);
        // key 3 gives blazing assault if anyone has overburn on turn start
        if (this.keysEnabled[2] && GameStateManager.getInstance().getTarget().hasBuff("Overburn"))
            this.addBuff("Blazing Assault 2", this.name, 1, 1);
    }

    cloneUnit() {
        return super.cloneUnit(new Sharkry(this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled));
    }
}

export class Cheeta extends Supporter {
    constructor(defense, attack, crit_chance, crit_damage, fortification, keysEnabled) {
        super("Cheeta", defense, attack, crit_chance, crit_damage, fortification, 2, keysEnabled);
        // key 1 starts with full index
        if (this.keysEnabled[0])
            this.CIndex = 6;
    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        // key 4 gives 3% atk per buff
        let buffCount = 0;
        if (this.keysEnabled[3]) {
            this.currentBuffs.forEach(buff => {
                if (buff[1][BuffJSONKeys.BUFF_TYPE] == "Buff")
                    buffCount++;
            });
            this.attackBoost += 0.03 * Math.min(buffCount, 5);
        }
        // skill2 conditional is to have blazing assault
        if (skillName == SkillNames.SKILL2 && this.hasBuff("Blazing Assault 2"))
            conditionalTriggered[0] = true;


        super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);

        if (this.keysEnabled[3])
            this.attackBoost -= 0.03 * Math.min(buffCount, 5);
        // if used ult, enable support attacks
        if (skillName == SkillNames.ULT)
            this.supportEnabled = true;
    }

    refreshSupportUses() {
        super.refreshSupportUses();
        // the buff called "support" uniquely ticks down at the start of each round rather than the end of her turn
        let foundSupport = 0;
        for (let i = 0; i < this.currentBuffs.length && !foundSupport; i++) {
            if (this.currentBuffs[i][0] == "Support") {
                this.currentBuffs[i][2]--;
                // losing the buff disables her support attacks
                if (this.currentBuffs[i][2] == 0) {
                    this.supportEnabled = false;
                    this.removeBuff("Support");
                }
                foundSupport = 1;
            }
        }
    }

    cloneUnit() {
        return super.cloneUnit(new Cheeta(this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled));
    }
}

export class Ksenia extends Supporter {
    constructor(defense, attack, crit_chance, crit_damage, fortification, keysEnabled) {
        super("Ksenia", defense, attack, crit_chance, crit_damage, fortification, 1, keysEnabled);
        // always has support enabled
        this.supportEnabled = true;
        // v4 increases the support limit
        if (fortification > 3)
            this.supportLimit = 2;
    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        // assume that the target always goes to full hp when healing
        if (skillName == SkillNames.SKILL3)
            conditionalTriggered[0] = true;
        // skill 2 conditional is having 2+ burn buffs
        if (skillName == SkillNames.SKILL2) {
            let burnBuffs = 0;
            this.currentBuffs.forEach(buff => {
                if (buff[1].hasOwnProperty(BuffJSONKeys.ELEMENT)) {
                    if (buff[1][BuffJSONKeys.ELEMENT] == Elements.BURN)
                        burnBuffs++;
                }
            });
            if (burnBuffs > 1)
                conditionalTriggered[0] = true;
        }

        super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);

        // key 3 gives 1 index when dealing burn damage
        if (this.keysEnabled[2]) {
            if (skillName == SkillNames.ULT)
                this.adjustIndex(1);
            else if (skillName == SkillNames.SKILL2 && conditionalTriggered[0])
                this.adjustIndex(1);
        }
        // onkill condition of key 2 on skill 2 increases support limit by 1 for the turn only
        if (this.keysEnabled[1] && skillName == SkillNames.SKILL2) {
            if (conditionalTriggered[1])
                this.supportsUsed--;
        }
    }

    addBuff(buffName, sourceName, duration = -1, stacks = 1) {
        // if buffs are already present, temporarily reduce stability to counteract the automatic addition of the passive effect later so that it does not stack
        if (this.hasBuff("Heat Recovery") && buffName == "Heat Recovery")
            this.stabilityDamageModifier--;
        if (this.fortification > 1 && this.hasBuff("Blazing Assault 2") && buffName == "Blazing Assault 2")
            this.stabilityDamageModifier--;
        super.addBuff(buffName, sourceName, duration, stacks);
        if (buffName ==  "Heat Recovery")
            this.stabilityDamageModifier++;
        if (this.fortification > 1 && buffName == "Blazing Assault 2")
            this.stabilityDamageModifier++;
    }

    removeBuff(buffName) {
        super.removeBuff(buffName);
        if (buffName ==  "Heat Recovery")
            this.stabilityDamageModifier--;
        if (this.fortification > 1 && buffName == "Blazing Assault 2")
            this.stabilityDamageModifier--;
    }

    endTurn() {
        super.endTurn();
        let burnBuffs = 0;
        this.currentBuffs.forEach(buff => {
            if (buff[1].hasOwnProperty(BuffJSONKeys.ELEMENT)) {
                if (buff[1][BuffJSONKeys.ELEMENT] == Elements.BURN)
                    burnBuffs++;
            }
        });
        this.adjustIndex(burnBuffs);
        // key 6 gives extra index if ending turn with heat recovery
        if (this.keysEnabled[5] && this.hasBuff("Heat Recovery"))
            this.adjustIndex(1);
    }

    cloneUnit() {
        return super.cloneUnit(new Ksenia(this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled));
    }
}