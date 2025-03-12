import Unit from "./Unit.js";
import ResourceLoader from "./ResourceLoader.js";
import { SkillNames, CalculationTypes, SkillJSONKeys } from "./Enums.js";
import GameStateManager from "./GameStateManager.js";
import DamageManager from "./DamageManager.js";
import RNGManager from "./RNGManager.js";

class Doll extends Unit {
    constructor(name, defense, attack, crit_chance, crit_damage, fortification) {
        super(name, defense);
        this.attack = attack;
        this.crit_chance = crit_chance;
        this.crit_damage = crit_damage;
        this.fortification = fortification;
        // resource used for some skills and doll mechanics
        this.CIndex = 3;
        // buffs used by attackers
        this.defenseIgnore = 0;
        this.damageDealt = 0;
        this.aoeDamageDealt = 0;
        this.targetedDamageDealt = 0;
        this.exposedDamageDealt = 0;
        this.supportDamageDealt = 0;
        this.phaseDamageDealt = 0;
        this.elementDamageDealt = {
            "Freeze" : 0,
            "Burn" : 0,
            "Corrosion" : 0,
            "Hydro" : 0,
            "Electric" : 0,
            "Physical" : 0
        };
        this.coverIgnore = 0;
        this.stabilityDamageModifier = 0;

        this.initializeSkillData();
    }

    getAttack() {return this.attack;}
    getCritRate() {return this.crit_chance;}
    getCritDamage() {return this.crit_damage;}
    // get any stats relevant to damage calculation
    getDefenseIgnore() {return this.defenseIgnore;}
    getDamageDealt() {return this.damageDealt;}
    getTargetedDamage() {return this.targetedDamageDealt;}
    getAoEDamage() {return this.aoeDamageDealt;}
    getExposedDamage() {return this.exposedDamageDealt;}
    getSupportDamage() {return this.supportDamageDealt;}
    getPhaseDamage() {return this.phaseDamageDealt;}
    getElementDamage(elementName) {return this.elementDamageDealt[elementName];}
    getCoverIgnore() {return this.coverIgnore;}
    getStabilityDamageModifier() {return this.stabilityDamageModifier;}
    // for direct buff input
    setDefenseIgnore(x) {this.defenseIgnore = x;}
    setDamageDealt(x) {this.damageDealt = x;}
    setAoEDamage(x) {this.aoeDamageDealt = x;}
    setTargetedDamage(x) {this.targetedDamageDealt = x;}
    setExposedDamage(x) {this.exposedDamageDealt = x;}
    setSupportDamage(x) {this.supportDamageDealt = x;}
    setPhaseDamage(x) {this.phaseDamageDealt = x;}
    setElementDamage(elementName, x) {this.elementDamageDealt[elementName] = x;}
    setCoverIgnore(x) {this.coverIgnore = x;}
    setStabilityDamageModifier(x) {this.stabilityDamageModifier = x;}

    initializeSkillData() {
        this.skillData = ResourceLoader.getInstance().getSkillData(this.name);
    }
    // process buffs using json data
    applyBuffEffects(buffData) {
        super.applyBuffEffects(buffData);
        if(buffData.hasOwnProperty("DamageTaken%"))
            this.damageTaken += buffData["DamageTaken%"];
        if(buffData.hasOwnProperty("AoEDamageTaken%"))
            this.aoeDamageTaken += buffData["AoEDamageTaken%"];
        if(buffData.hasOwnProperty("TargetedDamageTaken%"))
            this.targetedDamageTaken += buffData["TargetedDamageTaken%"];
    }
    removeBuffEffects(buffData) {
        super.removeBuffEffects(buffData);
    }
    // pass skill data to the game state manager to calculate damage dealt and then return the result, Expected, Crit, NoCrit, Simulation are options 
    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = 0) {
        // in the case of support attacks, target has 2 entries, the target and the supported unit
        let enemyTarget = target;
        let supportTarget;
        if (target.constructor == Array) {
            enemyTarget = target[0];
            supportTarget = target[1];
        }

        let skill;
        // get the data of the chosen skill
        switch (skillName) {
            case SkillNames.BASIC:
                skill = this.skillData[SkillNames.BASIC];
                break;
            case SkillNames.SKILL2:
                skill = this.skillData[SkillNames.SKILL2];
                break;
            case SkillNames.SKILL3:
                skill = this.skillData[SkillNames.SKILL3];
                break;
            case SkillNames.ULT:
                skill = this.skillData[SkillNames.ULT];
                break;
            case SkillNames.SUPPORT:
                skill = this.skillData[SkillNames.SUPPORT];
                break;
            default:
                console.error(`${skillName} is not in the skill names enum`);
        }
        // if conditional is triggered, overwrite the parts of the object that correspond to the keys in the conditional value
        if (conditionalTriggered && skill.hasOwnProperty(SkillJSONKeys.CONDITIONAL)) {
            let conditionalData = skill[SkillJSONKeys.CONDITIONAL];
            let conditionalOverrides = Object.keys(conditionalData);
            conditionalOverrides.forEach(d => {
                skill[d] = conditionalData[d];
            })
        }

        if (skill[SkillJSONKeys.TYPE] == "Attack") {
            this.processPrePostBuffs(skill, enemyTarget, supportTarget, 1);
            // if support attack, temporarily increase damage dealt stat then undo once damage has been calculated
            if (skillName == SkillNames.SUPPORT)
                this.damageDealt += this.supportDamageDealt;
            let damage = this.processAttack(skill, calculationType, target);
            if (skillName == SkillNames.SUPPORT)
                this.damageDealt -= this.supportDamageDealt;

            this.processPrePostBuffs(skill, enemyTarget, supportTarget, 0);
            // some skills have an extra attack which, unless stated otherwise, have the same data as the first attack 
            if (skill.hasOwnProperty(SkillJSONKeys.EXTRA_ATTACK)) {
                let extraAttack = skill[SkillJSONKeys.EXTRA_ATTACK];

                this.processPrePostBuffs(extraAttack, enemyTarget, supportTarget, 1);

                damage += this.processAttack(extraAttack, calculationType, target);

                this.processPrePostBuffs(extraAttack, enemyTarget, supportTarget, 0);
            }

            return damage;
        }
        // if a buffing skill rather than attack, return 0 damage after processing buff data
        else {
            this.processPrePostBuffs(skill, null, supportTarget, 0);
            console.log(this.currentBuffs);
            return 0;
        }
    }

    endTurn() {
        super.endTurn();
    }

    processAttack(skill, calculationType, target) {
        // set whether the attack crits or not
        let isCrit;
        let tempCritDmg = this.crit_damage;
        let tempCritRate = this.crit_chance;
        // if attack modifies crit, add it before incorporating it into the calculation type
        if (skill.hasOwnProperty(SkillJSONKeys.CRIT_DAMAGE_MODIFIER))
            tempCritDmg += skill[SkillJSONKeys.CRIT_DAMAGE_MODIFIER];
        if (skill.hasOwnProperty(SkillJSONKeys.CRIT_MODIFIER))
            tempCritRate += skill[SkillJSONKeys.CRIT_MODIFIER];
        switch(calculationType) {
            case CalculationTypes.CRIT:
                isCrit = 1;
                tempCritDmg = this.crit_damage;
                break;
            case CalculationTypes.NOCRIT:
                isCrit = 0;
                tempCritDmg = this.crit_damage;
                break;
            case CalculationTypes.EXPECTED: // get the expected value of the attack through linear interpolation from 1 to crit damage using crit rate
                isCrit = 1;
                tempCritDmg = (this.crit_damage - 1) * Math.max(Math.min(tempCritRate, 1), 0) + 1; // the effective value of crit rate should be bounded to 0-1
                break;
            case CalculationTypes.SIMULATION:
                isCrit = RNGManager.getInstance().getRNG() <= tempCritRate; // simulate a crit rng roll
                tempCritDmg = this.crit_damage;
                break;
            default:
                console.error(`${calculationType} is not a valid calculation type`);
        }

        // get fixed damage of attack, they typically scale off of one of our stats with a multiplier
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
            fixedDamage *= data[SkillJSONKeys.FIXED_DAMAGE_SCALING];
        }
        // get cover ignore of the attack
        let coverIgnore = 0;
        if (skill.hasOwnProperty(SkillJSONKeys.COVER_IGNORE))
            coverIgnore = skill[SkillJSONKeys.COVER_IGNORE];
        
        let damage = DamageManager.getInstance().calculateDamage(this, target, this.attack * skill[SkillJSONKeys.MULTIPLIER], skill[SkillJSONKeys.ELEMENT], 
            skill[SkillJSONKeys.AMMO_TYPE], skill[SkillJSONKeys.DAMAGE_TYPE], isCrit, tempCritDmg, skill[SkillJSONKeys.STABILITYDAMAGE], coverIgnore);

        damage += fixedDamage;
        target.takeDamage();

        return damage;
    }

    processPrePostBuffs(skill, target, supportTarget, isPreBuff) {
        if (isPreBuff) {
            // if the skill applies buffs before the attack
            if (skill.hasOwnProperty(SkillJSONKeys.PRE_SELF_BUFF)) {
                let statusEffects = skill[SkillJSONKeys.PRE_SELF_BUFF];
                // some skills apply multiple buffs so run a foreach loop to ensure all buffs are applies
                statusEffects.forEach(d => {
                    this.addBuff(d[SkillJSONKeys.BUFF_NAME], d[SkillJSONKeys.BUFF_DURATION], this);
                });
            }
            if (skill.hasOwnProperty(SkillJSONKeys.PRE_TARGET_BUFF)) {
                let statusEffects = skill[SkillJSONKeys.PRE_TARGET_BUFF];
                statusEffects.forEach(d => {
                    target.addBuff(d[SkillJSONKeys.BUFF_NAME], d[SkillJSONKeys.BUFF_DURATION], this);
                });
            }
            if (skill.hasOwnProperty(SkillJSONKeys.PRE_SUPPORT_BUFF)) {
                if (supportTarget) {
                    let statusEffects = skill[SkillJSONKeys.PRE_SUPPORT_BUFF];
                    statusEffects.forEach(d => {
                        supportTarget.addBuff(d[SkillJSONKeys.BUFF_NAME], d[SkillJSONKeys.BUFF_DURATION], this);
                    });
                }
                else
                    console.error(["Support Target not found for pre-support buff", this]);
            }
        }
        else {
            // if the skill applies buffs after the attack
            if (skill.hasOwnProperty(SkillJSONKeys.POST_TARGET_BUFF)) {
                let statusEffects = skill[SkillJSONKeys.POST_TARGET_BUFF];
                statusEffects.forEach(d => {
                    target.addBuff(d[SkillJSONKeys.BUFF_NAME], d[SkillJSONKeys.BUFF_DURATION], this);
                });
            }
            if (skill.hasOwnProperty(SkillJSONKeys.POST_SELF_BUFF)) {
                let statusEffects = skill[SkillJSONKeys.POST_SELF_BUFF];
                statusEffects.forEach(d => {
                    this.addBuff(d[SkillJSONKeys.BUFF_NAME], d[SkillJSONKeys.BUFF_DURATION], this);
                });
            }
            if (skill.hasOwnProperty(SkillJSONKeys.POST_SUPPORT_BUFF)) {
                if (supportTarget) {
                    let statusEffects = skill[SkillJSONKeys.POST_SUPPORT_BUFF];
                    statusEffects.forEach(d => {
                        supportTarget.addBuff(d[SkillJSONKeys.BUFF_NAME], d[SkillJSONKeys.BUFF_DURATION], this);
                    });
                }
                else
                    console.error(["Support Target not found for pre-support buff", this]);
            }
        }
    }
}

export default Doll;