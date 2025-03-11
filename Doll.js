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

    getDefenseIgnore() {return this.defenseIgnore;}
    getDamageDealt() {return this.damageDealt;}
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



        if (skill[SkillJSONKeys.TYPE] == "Attack") {
            let damage = this.processAttack(skill, calculationType, target);

            if (skill.hasOwnProperty(SkillJSONKeys.POST_TARGET_BUFF)) {
                let statusEffect = skill[SkillJSONKeys.POST_TARGET_BUFF];
                enemyTarget.addBuff(statusEffect["Name"], statusEffect["duration"], this);
            }

            if (skill.hasOwnProperty(SkillJSONKeys.EXTRA_ATTACK)) {
                damage += this.processAttack(skill[SkillJSONKeys.EXTRA_ATTACK], calculationType, target);
            }

            return damage;
        }
        // if a buffing skill rather than attack, return 0 damage
        else {
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

        // get fixed damage of attack
        let fixedDamage = 0;
        if (skill.hasOwnProperty(SkillJSONKeys.FIXED_DAMAGE)) {
            fixedDamage = skill[SkillJSONKeys.FIXED_DAMAGE];
        }
        // get cover ignore of the attack
        let coverIgnore = 0;
        if (skill.hasOwnProperty(SkillJSONKeys.COVER_IGNORE))
            coverIgnore = skill[SkillJSONKeys.COVER_IGNORE];
        
        let damage = DamageManager.getInstance().calculateDamage(this, target, this.attack * skill[SkillJSONKeys.MULTIPLIER], skill[SkillJSONKeys.ELEMENT], 
            skill[SkillJSONKeys.AMMO_TYPE], skill[SkillJSONKeys.DAMAGE_TYPE], isCrit, tempCritDmg, skill[SkillJSONKeys.STABILITYDAMAGE], coverIgnore);

        damage += fixedDamage;

        return damage;
    }
}

export default Doll;