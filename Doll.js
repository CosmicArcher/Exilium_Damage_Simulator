import Unit from "./Unit.js";
import ResourceLoader from "./ResourceLoader.js";
import { SkillNames, CalculationTypes, SkillJSONKeys, Elements, BuffJSONKeys, WeaponJSONKeys, AttackTypes, StatVariants } from "./Enums.js";
import GameStateManager from "./GameStateManager.js";
import DamageManager from "./DamageManager.js";
import RNGManager from "./RNGManager.js";
import GlobalBuffManager from "./GlobalBuffManager.js"
import EventManager from "./EventManager.js";

class Doll extends Unit {
    constructor(name, defense, attack, baseCrit, baseCritDamage, fortification, keys = [0,0,0,0,0,0], weaponName, weaponCalib, hasPhaseStrike = false) {
        super(name, defense);
        this.attack = attack;
        this.fortification = fortification;
        // resource used for some skills and doll mechanics
        this.CIndex = 3;
        /*
        this.baseCritChance = baseCrit;
        this.baseCritDamage = baseCritDamage;
        this.critChance = baseCrit;
        this.critDamage = baseCritDamage;
        // buffs used by attackers
        this.defenseIgnore = 0;
        this.damageDealt = 0;
        this.aoeDamageDealt = 0;
        this.targetedDamageDealt = 0;
        this.phaseDamageDealt = 0;
        this.elementDamageDealt = {
            "Freeze" : 0,
            "Burn" : 0,
            "Corrosion" : 0,
            "Hydro" : 0,
            "Electric" : 0,
            "Physical" : 0
        };
        this.stabilityDamageModifier = 0;
        
        // base values changed by direct input rather than automatic from buff applications
        this.baseDefenseIgnore = 0;
        this.baseDamageDealt = 0;
        this.baseAoEDamageDealt = 0;
        this.baseTargetedDamageDealt = 0;
        this.basePhaseDamageDealt = 0;
        this.baseElementDamageDealt = {
            "Freeze" : 0,
            "Burn" : 0,
            "Corrosion" : 0,
            "Hydro" : 0,
            "Electric" : 0,
            "Physical" : 0
        };
        this.baseStabilityDamageModifier = 0;*/
        this.attackBoost = 0;
        this.baseAttackBoost = 0;
        this.exposedDamageDealt = 0;
        this.slowedDamageDealt = 0;
        this.defDownDamageDealt = 0;
        this.supportDamageDealt = 0;
        this.coverIgnore = 0;
        this.stabilityIgnore = 0;
        this.baseExposedDamageDealt = 0;
        this.baseSlowedDamageDealt = 0;
        this.baseDefDownDamageDealt = 0;
        this.baseSupportDamageDealt = 0;
        this.baseCoverIgnore = 0;
        this.baseStabilityIgnore = 0;

        let variants = Object.values(StatVariants);
        this.damageDealt = {};
        this.stabilityDamageModifier = {};
        this.defenseIgnore = {};
        this.critChance = {};
        this.critDamage = {};
        this.baseDamageDealt = {};
        this.baseStabilityDamageModifier = {};
        this.baseDefenseIgnore = {};
        this.baseCritChance = {};
        this.baseCritDamage = {};
        variants.forEach(variant => {
            this.damageDealt[variant] = 0;
            this.stabilityDamageModifier[variant] = 0;
            this.defenseIgnore[variant] = 0;
            this.baseDamageDealt[variant] = 0;
            this.baseStabilityDamageModifier[variant] = 0;
            this.baseDefenseIgnore[variant] = 0;
            if (variant == StatVariants.ALL) {
                this.critChance[variant] = baseCrit;
                this.critDamage[variant] = baseCritDamage;
                this.baseCritChance[variant] = baseCrit;
                this.baseCritDamage[variant] = baseCritDamage;
            }
            else {
                this.critChance[variant] = 0;
                this.critDamage[variant] = 0;
                this.baseCritChance[variant] = 0;
                this.baseCritDamage[variant] = 0;
            }
        });
        
        // phase strike is a 15% damage buff if the target has any elemental debuffs
        this.hasPhaseStrike = hasPhaseStrike;
        // keys will be arranged numerically
        this.keysEnabled = keys;
        // weapon passives are hardcoded into whichever area they are triggered for now until a more elegant solution is found
        this.weaponName = weaponName;
        this.weaponCalib = weaponCalib;

        this.turnAvailable = true;
        this.cooldowns = [0,0,0,0];
        this.executingExtraAction = false;

        this.initializeSkillData();
        // merge the skill json with the fortification and key modifications of skills
        this.applyFortificationData();
        this.applyKeyData();

        this.initializeWeaponData();
        // apply the passive buffs of the gun
        this.applyGunEffects(WeaponJSONKeys.PASSIVE);
    }
    // for tracking which dolls have turns available
    hasTurnAvailable() {return this.turnAvailable;}
    getCIndex() {return this.CIndex;}
    getCooldowns() {return this.cooldowns;}
    // other miscellaneous getters
    getFinalSkillData() {return this.skillData;}
    getFortification() {return this.fortification;}
    getKeyEnabled(index) {return this.keysEnabled[index];} 

    getAttack() {return this.attack * (1 + this.attackBoost + GlobalBuffManager.getInstance().getGlobalAttack());}
    getCritRate(variant = StatVariants.ALL) {
        return this.critChance.hasOwnProperty(variant) ? this.critChance[variant] : 0;
    }
    getCritDamage(variant = StatVariants.ALL) {
        return this.critDamage.hasOwnProperty(variant) ? this.critDamage[variant] : 0;
    }
    getBaseCrit(variant = StatVariants.ALL) {
        return this.baseCritChance.hasOwnProperty(variant) ? this.baseCritChance[variant] : 0;
    }
    getBaseCritDamage(variant = StatVariants.ALL) {
        return this.baseCritDamage.hasOwnProperty(variant) ? this.baseCritDamage[variant] : 0;
    }
    getBaseAttack() {return this.attack;}
    getPhaseStrike() {return this.hasPhaseStrike;}
    getWeaponName() {return this.weaponName;}
    getWeaponCalibration() {return this.weaponCalib;}
    // get any stats relevant to damage calculation
    getDefenseIgnore(variant = StatVariants.ALL) {
        return this.defenseIgnore.hasOwnProperty(variant) ? this.defenseIgnore[variant] : 0;
    }
    getDamageDealt(variant = StatVariants.ALL) {
        return this.damageDealt.hasOwnProperty(variant) ? this.damageDealt[variant] : 0;
    }
    //getTargetedDamage() {return this.targetedDamageDealt;}
    //getAoEDamage() {return this.aoeDamageDealt;}
    getExposedDamage() {return this.exposedDamageDealt;}
    getSlowedDamage() {return this.slowedDamageDealt;}
    getDefDownDamage() {return this.defDownDamageDealt;}
    getSupportDamage() {return this.supportDamageDealt;}
    //getPhaseDamage() {return this.phaseDamageDealt;}
    //getElementDamage(elementName) {return this.elementDamageDealt[elementName];}
    getCoverIgnore() {return this.coverIgnore;}
    getStabilityDamageModifier(variant = StatVariants.ALL) {
        return this.stabilityDamageModifier.hasOwnProperty(variant) ? this.stabilityDamageModifier[variant] : 0;
    }
    getStabilityIgnore() {return this.stabilityIgnore;}
    getAttackBoost() {return this.attackBoost;}
    // get the base stats for display mid-simulation
    getBaseDefenseIgnore(variant = StatVariants.ALL) {
        return this.baseDefenseIgnore.hasOwnProperty(variant) ? this.baseDefenseIgnore[variant] : 0;
    }
    getBaseDamageDealt(variant = StatVariants.ALL) {
        return this.baseDamageDealt.hasOwnProperty(variant) ? this.baseDamageDealt[variant] : 0;
    }
    //getBaseTargetedDamage() {return this.baseTargetedDamageDealt;}
    //getBaseAoEDamage() {return this.baseAoEDamageDealt;}
    getBaseExposedDamage() {return this.baseExposedDamageDealt;}
    getBaseSlowedDamage() {return this.baseSlowedDamageDealt;}
    getBaseDefDownDamage() {return this.baseDefDownDamageDealt;}
    getBaseSupportDamage() {return this.baseSupportDamageDealt;}
    //getBasePhaseDamage() {return this.basePhaseDamageDealt;}
    //getBaseElementDamage(elementName) {return this.baseElementDamageDealt[elementName];}
    getBaseCoverIgnore() {return this.baseCoverIgnore;}
    getBaseStabilityDamageModifier(variant = StatVariants.ALL) {
        return this.baseStabilityDamageModifier.hasOwnProperty(variant) ? this.baseStabilityDamageModifier[variant] : 0;
    }
    getBaseStabilityIgnore() {return this.baseStabilityIgnore;}
    getBaseAttackBoost() {return this.baseAttackBoost;}
    // for direct buff input
    setDefenseIgnore(x, variant = StatVariants.ALL) {
        if (Object.values(StatVariants).includes(variant)) {
            this.resetDefenseIgnore(variant);
            this.baseDefenseIgnore[variant] = x;
            this.defenseIgnore[variant] += x;
        }
        else
            console.error(`${variant} does not exist in StatVariants`);
    }
    setDamageDealt(x, variant = StatVariants.ALL) {
        if (Object.values(StatVariants).includes(variant)) {
            this.resetDamageDealt(variant);
            this.baseDamageDealt[variant] = x;
            this.damageDealt[variant] += x;
        }
        else
            console.error(`${variant} does not exist in StatVariants`);
    }
    /*setAoEDamage(x) {
        this.resetAoEDamage();
        this.baseAoEDamageDealt = x;
        this.aoeDamageDealt += x;
    }
    setTargetedDamage(x) {
        this.resetTargetedDamage();
        this.baseTargetedDamageDealt = x;
        this.targetedDamageDealt += x;
    }*/
    setExposedDamage(x) {
        this.resetExposedDamage();
        this.baseExposedDamageDealt = x;
        this.exposedDamageDealt += x;
    }
    setSlowedDamage(x) {
        this.resetSlowedDamage();
        this.baseSlowedDamageDealt = x;
        this.slowedDamageDealt += x;
    }
    setDefDownDamage(x) {
        this.resetDefDownDamage();
        this.baseDefDownDamageDealt = x;
        this.defDownDamageDealt += x;
    }
    setSupportDamage(x) {
        this.resetSupportDamage();
        this.baseSupportDamageDealt = x;
        this.supportDamageDealt += x;
    }
    /*setPhaseDamage(x) {
        this.resetPhaseDamage();
        this.basePhaseDamageDealt = x;
        this.phaseDamageDealt += x;
    }
    setElementDamage(elementName, x) {
        this.resetElementDamage(elementName);
        this.baseElementDamageDealt[elementName] = x;
        this.elementDamageDealt[elementName] += x;
    }*/
    setCoverIgnore(x) {
        this.resetCoverIgnore();
        this.baseCoverIgnore = x;
        this.coverIgnore += x;
    }
    setStabilityDamageModifier(x, variant = StatVariants.ALL) {
        if (Object.values(StatVariants).includes(variant)) {
            this.resetStabilityDamageModifier(variant);
            this.baseStabilityDamageModifier[variant] = x;
            this.stabilityDamageModifier[variant] += x;
        }
        else
            console.error(`${variant} does not exist in StatVariants`);
    }
    setStabilityIgnore(x) {
        this.resetStabilityIgnore();
        this.baseStabilityIgnore = x;
        this.stabilityIgnore += x;
    }
    setAttackBoost(x) {
        this.resetAttackBoost();
        this.baseAttackBoost = x;
        this.attackBoost += x;
    }
    setAttack(x) {this.attack = x;}
    setCritRate(x, variant = StatVariants.ALL) {
        if (Object.values(StatVariants).includes(variant)) {
            this.resetCrit(variant);
            this.baseCritChance[variant] = x;
            this.critChance[variant] += x;
        }
        else
            console.error(`${variant} does not exist in StatVariants`);
    }
    setCritDamage(x, variant = StatVariants.ALL) {
        if (Object.values(StatVariants).includes(variant)) {
            this.resetCritDamage(variant);
            this.baseCritDamage[variant] = x;
            this.critDamage[variant] += x;
        }
        else
            console.error(`${variant} does not exist in StatVariants`);
    }
    // when using the setters, undo the addition of the previous base multipliers
    resetDefenseIgnore(variant = StatVariants.ALL) {
        if (Object.values(StatVariants).includes(variant)) {
            this.defenseIgnore[variant] -= this.baseDefenseIgnore[variant];
            this.baseDefenseIgnore[variant] = 0;
        }
        else
            console.error(`${variant} does not exist in StatVariants`);
    }
    resetDamageDealt(variant = StatVariants.ALL) {
        if (Object.values(StatVariants).includes(variant)) {
            this.damageDealt[variant] -= this.baseDamageDealt[variant];
            this.baseDamageDealt[variant] = 0;
        }
        else
            console.error(`${variant} does not exist in StatVariants`);
    }
    /*resetAoEDamage() {
        this.aoeDamageDealt -= this.baseAoEDamageDealt;
        this.baseAoEDamageDealt = 0;
    }
    resetTargetedDamage() {
        this.targetedDamageDealt -= this.baseTargetedDamageDealt;
        this.baseTargetedDamageDealt = 0;
    }*/
    resetExposedDamage() {
        this.exposedDamageDealt -= this.baseExposedDamageDealt;
        this.baseExposedDamageDealt = 0;
    }
    resetSlowedDamage() {
        this.slowedDamageDealt -= this.baseSlowedDamageDealt;
        this.baseSlowedDamageDealt = 0;
    }
    resetSupportDamage() {
        this.supportDamageDealt -= this.baseSupportDamageDealt;
        this.baseSupportDamageDealt = 0;
    }
    resetDefDownDamage() {
        this.defDownDamageDealt -= this.baseDefDownDamageDealt;
        this.baseDefDownDamageDealt = 0;
    }
    /*resetPhaseDamage() {
        this.phaseDamageDealt -= this.basePhaseDamageDealt;
        this.basePhaseDamageDealt = 0;
    }
    resetElementDamage(elementName) {
        this.elementDamageDealt[elementName] -= this.baseElementDamageDealt[elementName];
        this.baseElementDamageDealt[elementName] = 0;
    }*/
    resetCoverIgnore() {
        this.coverIgnore -= this.baseCoverIgnore;
        this.baseCoverIgnore = 0;
    }
    resetStabilityDamageModifier(variant = StatVariants.ALL) {
        if (Object.values(StatVariants).includes(variant)) {
            this.stabilityDamageModifier[variant] -= this.baseStabilityDamageModifier[variant];
            this.baseStabilityDamageModifier[variant] = 0;
        }
        else
            console.error(`${variant} does not exist in StatVariants`);
    }
    resetStabilityIgnore() {
        this.stabilityIgnore -= this.baseStabilityIgnore;
        this.baseStabilityIgnore = 0;
    }
    resetAttackBoost() {
        this.attackBoost -= this.baseAttackBoost;
        this.baseAttackBoost = 0;
    }
    resetCrit(variant = StatVariants.ALL) {
        if (Object.values(StatVariants).includes(variant)) {
            this.critChance[variant] -= this.baseCritChance[variant];
            this.baseCritChance[variant] = 0;
        }
        else
            console.error(`${variant} does not exist in StatVariants`);
    }
    resetCritDamage(variant = StatVariants.ALL) {
        if (Object.values(StatVariants).includes(variant)) {
            this.critDamage[variant] -= this.baseCritDamage[variant];
            this.baseCritDamage[variant] = 0;
        }
        else
            console.error(`${variant} does not exist in StatVariants`);
    }
    // get the data belonging to the doll from the loaded jsons
    initializeSkillData() {
        this.skillData = ResourceLoader.getInstance().getSkillData(this.name);
        this.fortData = ResourceLoader.getInstance().getFortData(this.name);
        this.keyData = ResourceLoader.getInstance().getKeyData(this.name);
        // change skilldata from a reference to resource loader's json to directly having its own copy of the values
        this.copySkillJSON();
    }
    initializeWeaponData() {
        this.weaponData = ResourceLoader.getInstance().getWeaponData(this.weaponName);
    }
    // merge the upgrades from fortification into skill data
    applyFortificationData() {
        for (let i = 1; i <= this.fortification; i++) {
            // check if the fortification level modifies skill data
            if (this.fortData.hasOwnProperty("V" + i)) {
                let fortification = this.fortData["V" + i];
                // some fortifications modify multiple skills at once, typically by modifying a unique buff that multiple skills apply
                let fortificationSkills = Object.keys(fortification);
                fortificationSkills.forEach(skill_name => {
                    this.mergeData(this.skillData[skill_name], fortification[skill_name]);
                });
            }
        }
    }
    // merge the modifications from key into skill data after fort data has merged
    applyKeyData() {
        for (let i = 0; i < 6; i++) {
            // check if the key is equipped
            if (this.keysEnabled[i]) {
                // check if the key modifies a skill
                if (this.keyData[Object.keys(this.keyData)[i]].hasOwnProperty("Skill")) {
                    let skill = this.keyData[Object.keys(this.keyData)[i]]["Skill"];
                    Object.keys(skill).forEach(skill_name => {
                        // merge the skill json with the skill modified by the key, overwriting and appending where necessary
                        this.mergeData(this.skillData[skill_name], skill[skill_name]);
                    });
                }
            }
        }
    }
    addBuff(buffName, sourceName, duration = -1, stacks = 1) {
        // apply gun bonus when insight is gained but not already present to prevent unintended stacking
        if (buffName == "Insight" && !this.hasBuff("Insight"))
            this.applyGunEffects(WeaponJSONKeys.ON_INSIGHT);
        super.addBuff(buffName, sourceName, duration, stacks);
        // golden melody applies charging buff upon gaining non-charging buffs
        if (this.weaponName == "Golden Melody" && !/Charging C/.test(buffName)) {
            let buffData = ResourceLoader.getInstance().getBuffData(buffName);
            // only apply charging if a buff is applied, not debuffs
            if (buffData[BuffJSONKeys.BUFF_TYPE] == "Buff")
                this.applyGunBuffs();
        }
    }
    removeBuff(buffName) {
        // remove on insight gun effects when losing the buff
        if (buffName == "Insight")
            this.removeGunEffects(WeaponJSONKeys.ON_INSIGHT);
        super.removeBuff(buffName);
    }
    // apply the buffs of the gun that belong to the specified key, passive, on_move, exposed, phase_exploit, etc
    applyGunEffects(objectKey = WeaponJSONKeys.PASSIVE, triggerElement = Elements.PHYSICAL) {
        // check if gun has a passive effect
        if (this.weaponData.hasOwnProperty(objectKey)) {
            let passiveData = this.weaponData[objectKey];
            // passives that have conditions that stack are assumed to have stacked to the max on all attacks unless it requires movement
            if (passiveData.hasOwnProperty(WeaponJSONKeys.DAMAGE_PERC)) {
                let buffs = passiveData[WeaponJSONKeys.DAMAGE_PERC];
                // because samosek has both phase and element damage_perc, all damage_perc entries are arrays able to hold multiple variants
                buffs.forEach(buff => {
                    if (this.damageDealt.hasOwnProperty(buff[0]))
                        this.damageDealt[buff[0]] += buff[1][this.weaponCalib - 1];
                    else
                        console.error(`${buff[0]} is not covered by StatVariants`);
                });
            }
            //    this.damageDealt[StatVariants.ALL] += passiveData[WeaponJSONKeys.DAMAGE_PERC][this.weaponCalib - 1];
            if (passiveData.hasOwnProperty(WeaponJSONKeys.CRIT_DAMAGE)) {
                let buffs = passiveData[WeaponJSONKeys.CRIT_DAMAGE];
                buffs.forEach(buff => {
                    if (this.critDamage.hasOwnProperty(buff[0]))
                        this.critDamage[buff[0]] += buff[1][this.weaponCalib - 1];
                    else
                        console.error(`${buff[0]} is not covered by StatVariants`);
                });
            }
            //    this.critDamage[StatVariants.ALL] += passiveData[WeaponJSONKeys.CRIT_DAMAGE][this.weaponCalib - 1];
            if (passiveData.hasOwnProperty(WeaponJSONKeys.DEFENSE_IGNORE)) {
                let buffs = passiveData[WeaponJSONKeys.DEFENSE_IGNORE];
                buffs.forEach(buff => {
                    if (this.defenseIgnore.hasOwnProperty(buff[0]))
                        this.defenseIgnore[buff[0]] += buff[1][this.weaponCalib - 1];
                    else
                        console.error(`${buff[0]} is not covered by StatVariants`);
                });
            }
            //    this.defenseIgnore[StatVariants.ALL] += passiveData[WeaponJSONKeys.DEFENSE_IGNORE][this.weaponCalib - 1];
            /*if (passiveData.hasOwnProperty(WeaponJSONKeys.ELEMENTAL_DAMAGE))
                this.damageDealt[passiveData[WeaponJSONKeys.ELEMENTAL_DAMAGE][0]] += passiveData[WeaponJSONKeys.ELEMENTAL_DAMAGE][1][this.weaponCalib - 1];
            if (passiveData.hasOwnProperty(WeaponJSONKeys.PHASE_DAMAGE))
                this.damageDealt[StatVariants.PHASE] += passiveData[WeaponJSONKeys.PHASE_DAMAGE][this.weaponCalib - 1];*/
            if (passiveData.hasOwnProperty(WeaponJSONKeys.STABILITY_IGNORE))
                this.stabilityIgnore += passiveData[WeaponJSONKeys.STABILITY_IGNORE][this.weaponCalib - 1];

            // for the case of phase exploit, check if it has bonus effects on a specific element exploited
            if (objectKey == WeaponJSONKeys.PHASE_EXPLOIT) {
                if (passiveData.hasOwnProperty(WeaponJSONKeys.EXPLOIT_ELEMENT)) {
                    // the only time this bonus effect exists is in weapon traits for defense ignore which do not scale with calibration
                    if (passiveData[WeaponJSONKeys.EXPLOIT_ELEMENT][0] == triggerElement)
                        this.defenseIgnore[StatVariants.ALL] += passiveData[WeaponJSONKeys.EXPLOIT_ELEMENT][1][this.weaponCalib - 1];
                }
            }
        }
    }
    // for removing gun effects that should only take effect for certain attacks
    removeGunEffects(objectKey = WeaponJSONKeys.PHASE_EXPLOIT, triggerElement = Elements.PHYSICAL) {
        // check if gun has a passive effect
        if (this.weaponData.hasOwnProperty(objectKey)) {
            let passiveData = this.weaponData[objectKey];
            // passives that have conditions that stack are assumed to have stacked to the max on all attacks unless it requires movement
            if (passiveData.hasOwnProperty(WeaponJSONKeys.DAMAGE_PERC))
                this.damageDealt[StatVariants.ALL] -= passiveData[WeaponJSONKeys.DAMAGE_PERC][this.weaponCalib - 1];
            if (passiveData.hasOwnProperty(WeaponJSONKeys.CRIT_DAMAGE))
                this.critDamage[StatVariants.ALL] -= passiveData[WeaponJSONKeys.CRIT_DAMAGE][this.weaponCalib - 1];
            if (passiveData.hasOwnProperty(WeaponJSONKeys.DEFENSE_IGNORE))
                this.defenseIgnore[StatVariants.ALL] -= passiveData[WeaponJSONKeys.DEFENSE_IGNORE][this.weaponCalib - 1];
            if (passiveData.hasOwnProperty(WeaponJSONKeys.ELEMENTAL_DAMAGE))
                this.damageDealt[passiveData[WeaponJSONKeys.ELEMENTAL_DAMAGE][0]] -= passiveData[WeaponJSONKeys.ELEMENTAL_DAMAGE][1][this.weaponCalib - 1];
            if (passiveData.hasOwnProperty(WeaponJSONKeys.PHASE_DAMAGE))
                this.damageDealt[StatVariants.PHASE] -= passiveData[WeaponJSONKeys.PHASE_DAMAGE][this.weaponCalib - 1];
            if (passiveData.hasOwnProperty(WeaponJSONKeys.STABILITY_IGNORE))
                this.stabilityIgnore -= passiveData[WeaponJSONKeys.STABILITY_IGNORE][this.weaponCalib - 1];

            // for the case of phase exploit, check if it has bonus effects on a specific element exploited
            if (objectKey == WeaponJSONKeys.PHASE_EXPLOIT) {
                if (passiveData.hasOwnProperty(WeaponJSONKeys.EXPLOIT_ELEMENT)) {
                    // the only time this bonus effect exists is in weapon traits for defense ignore
                    if (passiveData[WeaponJSONKeys.EXPLOIT_ELEMENT][0] == triggerElement)
                        this.defenseIgnore[StatVariants.ALL] -= passiveData[WeaponJSONKeys.EXPLOIT_ELEMENT][1][this.weaponCalib - 1];
                }
            }
        }
    }
    // for applying the buffs of the gun, called only with specific gun names in their respective areas
    applyGunBuffs() {
        if (this.weaponData.hasOwnProperty(WeaponJSONKeys.BUFF)) {
            let buffData = this.weaponData[WeaponJSONKeys.BUFF];
            // if the buff data is for the doll herself
            if (buffData[WeaponJSONKeys.BUFF_TARGET] == "Self") {
                this.addBuff(buffData[WeaponJSONKeys.BUFF_NAME] + " C" + this.weaponCalib, this.name, -1, buffData[WeaponJSONKeys.BUFF_STACKS][this.weaponCalib - 1]);
            }
            // if the buff data is for the target of the attack
            else {
                let target = GameStateManager.getInstance().getTarget();
                target.addBuff(buffData[WeaponJSONKeys.BUFF_NAME] + " C" + this.weaponCalib, this.name, -1, buffData[WeaponJSONKeys.BUFF_STACKS][this.weaponCalib - 1]);
            }
        }
        else {
            console.error(`${this.weaponName} does not have buffs`);
        }
    }
    // for getting the element of the debuffs that triggers special gun effects
    getGunElementExploit() {
        if (this.weaponData.hasOwnProperty(WeaponJSONKeys.ELEMENTAL_DEBUFF))
            return this.weaponData[WeaponJSONKeys.ELEMENTAL_DEBUFF][WeaponJSONKeys.DEBUFF_ELEMENT];
        else
            return Elements.PHYSICAL;
    }
    // get the attack type of the skill 
    getSkillAttackType(skillName) {
        if (this.skillData.hasOwnProperty(skillName)) 
            return this.skillData[skillName][SkillJSONKeys.DAMAGE_TYPE];
        console.error(`${skillName} is not in ${this.name}'s skill names`);
    }
    // process buffs using json data
    applyBuffEffects(buffData, stacks = 1, stackable = false) {
        super.applyBuffEffects(buffData);
        let stackEffect = 1;
        if (stackable)
            stackEffect = stacks;
        if(buffData.hasOwnProperty(BuffJSONKeys.DAMAGE_PERC)) {
            let buff = buffData[BuffJSONKeys.DAMAGE_PERC];
            if (this.damageDealt.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.damageDealt[buff[0]] += buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
        if(buffData.hasOwnProperty(BuffJSONKeys.CRIT_RATE)) {
            let buff = buffData[BuffJSONKeys.CRIT_RATE];
            if (this.critChance.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.critChance[buff[0]] += buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
        if(buffData.hasOwnProperty(BuffJSONKeys.CRIT_DAMAGE)) {
            let buff = buffData[BuffJSONKeys.CRIT_DAMAGE];
            if (this.critDamage.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.critDamage[buff[0]] += buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
        if(buffData.hasOwnProperty(BuffJSONKeys.STABILITY_DAMAGE)) {
            let buff = buffData[BuffJSONKeys.STABILITY_DAMAGE];
            if (this.stabilityDamageModifier.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.stabilityDamageModifier[buff[0]] += buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
        if(buffData.hasOwnProperty(BuffJSONKeys.DEFENSE_IGNORE)) {
            let buff = buffData[BuffJSONKeys.DEFENSE_IGNORE];
            if (this.defenseIgnore.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.defenseIgnore[buff[0]] += buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
        //    this.damageDealt[StatVariants.ALL] += buffData[BuffJSONKeys.DAMAGE_PERC] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.ATTACK_PERC))
            this.attackBoost += buffData[BuffJSONKeys.ATTACK_PERC] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.SUPPORT_PERC))
            this.supportDamageDealt += buffData[BuffJSONKeys.SUPPORT_PERC] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.EXPOSED_PERC))
            this.exposedDamageDealt += buffData[BuffJSONKeys.EXPOSED_PERC] * stackEffect;
        /*if(buffData.hasOwnProperty(BuffJSONKeys.CRIT_RATE))
            this.critChance[StatVariants.ALL] += buffData[BuffJSONKeys.CRIT_RATE] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.CRIT_DAMAGE))
            this.critDamage[StatVariants.ALL] += buffData[BuffJSONKeys.CRIT_DAMAGE] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.STABILITY_DAMAGE))
            this.stabilityDamageModifier[StatVariants.ALL] += buffData[BuffJSONKeys.STABILITY_DAMAGE] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.DEFENSE_IGNORE))
            this.defenseIgnore[StatVariants.ALL] += buffData[BuffJSONKeys.DEFENSE_IGNORE] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.PHASE_DAMAGE))
            this.damageDealt[StatVariants.PHASE] += buffData[BuffJSONKeys.PHASE_DAMAGE] * stackEffect;
        if (buffData.hasOwnProperty(BuffJSONKeys.ELEMENTAL_DAMAGE))
            this.damageDealt[buffData[BuffJSONKeys.ELEMENTAL_DAMAGE][0]] += buffData[BuffJSONKeys.ELEMENTAL_DAMAGE][1] * stackEffect;
        */
    }
    removeBuffEffects(buffData, stacks = 1, stackable = false) {
        super.removeBuffEffects(buffData);
        let stackEffect = 1;
        if (stackable)
            stackEffect = stacks;
        if(buffData.hasOwnProperty(BuffJSONKeys.DAMAGE_PERC)) {
            let buff = buffData[BuffJSONKeys.DAMAGE_PERC];
            if (this.damageDealt.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.damageDealt[buff[0]] -= buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
        if(buffData.hasOwnProperty(BuffJSONKeys.CRIT_RATE)) {
            let buff = buffData[BuffJSONKeys.CRIT_RATE];
            if (this.critChance.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.critChance[buff[0]] -= buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
        if(buffData.hasOwnProperty(BuffJSONKeys.CRIT_DAMAGE)) {
            let buff = buffData[BuffJSONKeys.CRIT_DAMAGE];
            if (this.critDamage.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.critDamage[buff[0]] -= buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
        if(buffData.hasOwnProperty(BuffJSONKeys.STABILITY_DAMAGE)) {
            let buff = buffData[BuffJSONKeys.STABILITY_DAMAGE];
            if (this.stabilityDamageModifier.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.stabilityDamageModifier[buff[0]] -= buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
        if(buffData.hasOwnProperty(BuffJSONKeys.DEFENSE_IGNORE)) {
            let buff = buffData[BuffJSONKeys.DEFENSE_IGNORE];
            if (this.defenseIgnore.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.defenseIgnore[buff[0]] -= buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
        if(buffData.hasOwnProperty(BuffJSONKeys.ATTACK_PERC))
            this.attackBoost -= buffData[BuffJSONKeys.ATTACK_PERC] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.SUPPORT_PERC))
            this.supportDamageDealt -= buffData[BuffJSONKeys.SUPPORT_PERC] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.EXPOSED_PERC))
            this.exposedDamageDealt -= buffData[BuffJSONKeys.EXPOSED_PERC] * stackEffect;
        /*if(buffData.hasOwnProperty(BuffJSONKeys.CRIT_RATE))
            this.critChance[StatVariants.ALL] -= buffData[BuffJSONKeys.CRIT_RATE] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.CRIT_DAMAGE))
            this.critDamage[StatVariants.ALL] -= buffData[BuffJSONKeys.CRIT_DAMAGE] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.STABILITY_DAMAGE))
            this.stabilityDamageModifier[StatVariants.ALL] -= buffData[BuffJSONKeys.STABILITY_DAMAGE] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.DEFENSE_IGNORE))
            this.defenseIgnore[StatVariants.ALL] -= buffData[BuffJSONKeys.DEFENSE_IGNORE] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.PHASE_DAMAGE))
            this.damageDealt[StatVariants.PHASE] -= buffData[BuffJSONKeys.PHASE_DAMAGE] * stackEffect;
        if (buffData.hasOwnProperty(BuffJSONKeys.ELEMENTAL_DAMAGE))
            this.damageDealt[buffData[BuffJSONKeys.ELEMENTAL_DAMAGE][0]] -= buffData[BuffJSONKeys.ELEMENTAL_DAMAGE][1] * stackEffect;
        */
    }
    // pass skill data to the game state manager to calculate damage dealt and then return the result, Expected, Crit, NoCrit, Simulation are options 
    // conditionals in skills are set automatically by the respective doll class or by an override checkbox in the menu
    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        // in the case of support attacks, target has 2 entries, the target and the supported unit
        let enemyTarget = target;
        let supportTarget;
        if (target.constructor == Array) {
            enemyTarget = target[0];
            supportTarget = target[1];
        }

        let skill;
        // get the data of the chosen skill
        if (this.skillData.hasOwnProperty(skillName))
            skill = this.copyNestedObject(this.skillData[skillName]);
        else
            console.error(`${skillName} is not in ${this.name}'s skill names`);
        // if v1+ makiatto skill2 or v6 intercept condition is triggered, that means that the first hit crit so just change the calculation type to crit
        if (this.name == "Makiatto") {
            if ((skillName == SkillNames.SKILL2 && this.fortification > 0) || (skillName == SkillNames.INTERCEPT && this.fortification == 6)) {
                if (conditionalTriggered[0]) {
                    calculationType = CalculationTypes.CRIT;
                }
                // if conditional is not triggered, check if this is v1+ skill2 or v6 intercept with crit or expected calculation type and get the oncrit buff anyway
                else if (calculationType == CalculationTypes.CRIT || calculationType == CalculationTypes.EXPECTED)
                    conditionalTriggered[0] = true;
            }
        }

        // if conditional is triggered, overwrite the parts of the object that correspond to the keys in the conditional value or append to arrays if flagged
        if (skill.hasOwnProperty(SkillJSONKeys.CONDITIONAL)) {
            conditionalTriggered.forEach((flag, index) => {
                if (flag) {
                    let conditionalData = skill[SkillJSONKeys.CONDITIONAL][index];
                    this.mergeData(skill, conditionalData);
                }
            });
        }

        if (skill[SkillJSONKeys.TYPE] == "Attack") {
            // C6 heavy strings (no more rng) and classified manuscript are assumed that their cleanse procs from proper use
            if (this.weaponName == "Heavy Strings" && this.weaponCalib == 6)
                enemyTarget.addBuff("Cleanse", this.name, 1, 1);
            else if (this.weaponName == "Classified Manuscript") {
                if (this.weaponCalib < 3)
                    enemyTarget.addBuff("Cleanse", this.name, 1, 1);
                else if (this.weaponCalib < 6)
                    enemyTarget.addBuff("Cleanse", this.name, 1, 2);
                else
                    enemyTarget.addBuff("Cleanse", this.name, 1, 3);
            }
            this.processPrePostBuffs(skill, enemyTarget, supportTarget, true);
            // if out of turn attack, temporarily increase damage dealt stat then undo once damage has been calculated
            if (skillName == SkillNames.SUPPORT || skillName == SkillNames.COUNTERATTACK || skillName == SkillNames.INTERCEPT)
                this.damageDealt[StatVariants.ALL] += this.supportDamageDealt;
            let damage;
            // if simulating with v1+ makiatto skill2, do the crit roll outside of the function to track the condition flag for the next hit
            if (calculationType == CalculationTypes.SIMULATION && this.name == "Makiatto" && this.fortification > 0 && skillName == SkillNames.SKILL2) {
                let isCrit = RNGManager.getInstance().getRNG() <= this.critChance[StatVariants.ALL];
                damage = this.processAttack(skill, isCrit ? CalculationTypes.CRIT : CalculationTypes.NOCRIT, enemyTarget, skillName);
                // modify the skill data for condition pass if isCrit is true
                if (isCrit) {
                    let conditionalData = skill[SkillJSONKeys.CONDITIONAL][0];
                    this.mergeData(skill, conditionalData);
                }
            }
            else 
                damage = this.processAttack(skill, calculationType, enemyTarget, skillName);

            if (skillName == SkillNames.SUPPORT || skillName == SkillNames.COUNTERATTACK || skillName == SkillNames.INTERCEPT)
                this.damageDealt[StatVariants.ALL] -= this.supportDamageDealt;

            this.processPrePostBuffs(skill, enemyTarget, supportTarget, false);
            // some skills have an extra attack which, unless stated otherwise, have the same data as the first attack 
            if (skill.hasOwnProperty(SkillJSONKeys.EXTRA_ATTACK)) {
                let extraAttack = skill[SkillJSONKeys.EXTRA_ATTACK];

                this.processPrePostBuffs(extraAttack, enemyTarget, supportTarget, true);

                damage += this.processAttack(extraAttack, calculationType, enemyTarget, skillName);

                this.processPrePostBuffs(extraAttack, enemyTarget, supportTarget, false);
            }
            // check if skill was used during turn or out of turn
            if (!(skillName == SkillNames.SUPPORT || skillName == SkillNames.COUNTERATTACK || skillName == SkillNames.INTERCEPT)) {
                // end turn and decrease counters on buffs if extra command or movement is not triggered
                if (!(this.hasBuff("Extra Command") || this.hasBuff("Extra Movement")))
                    this.endTurn();
                else {
                    if (this.hasBuff("Extra Command")) {
                        this.removeBuff("Extra Command");
                        this.executingExtraAction = true;
                    }
                    if (this.hasBuff("Extra Movement")) {
                        this.removeBuff("Extra Movement");
                        this.executingExtraAction = true;
                        // temporary until movement grid is implemented
                        this.endTurn();
                    }
                }
                // extra action counts down on buff duration but enables another turn
                if (this.hasBuff("Extra Action")) {
                    this.turnAvailable = true;
                    this.removeBuff("Extra Action");
                    this.executingExtraAction = true;
                }
            }
        }
        // if a buffing skill rather than attack, process buff data with supportTarget in the target parameter
        else {
            this.processPrePostBuffs(skill, supportTarget, null, true);
            if (!(skillName == SkillNames.SUPPORT || skillName == SkillNames.COUNTERATTACK || skillName == SkillNames.INTERCEPT)) {
                // end turn and decrease counters on buffs if extra command or movement is not triggered
                if (!(this.hasBuff("Extra Command") || this.hasBuff("Extra Movement")))
                    this.endTurn();
                else {
                    if (this.hasBuff("Extra Command")) {
                        this.removeBuff("Extra Command");
                        this.executingExtraAction = true;
                    }
                    if (this.hasBuff("Extra Movement")) {
                        this.removeBuff("Extra Movement");
                        this.executingExtraAction = true;
                        // temporary until movement grid is implemented
                        this.endTurn();
                    }
                }
                // extra action counts down on buff duration but enables another turn
                if (this.hasBuff("Extra Action")) {
                    this.turnAvailable = true;
                    this.removeBuff("Extra Action");
                    this.executingExtraAction = true;
                }
            }

            if (skill[SkillJSONKeys.BUFF_TARGET] == "All") {
                GameStateManager.getInstance().getAllDolls().forEach(doll => {
                    if (skill.hasOwnProperty(SkillJSONKeys.POST_TARGET_BUFF)) {
                        let statusEffects = skill[SkillJSONKeys.POST_TARGET_BUFF];
                        statusEffects.forEach(buff => {
                            let stacks = 1;
                            if (buff.hasOwnProperty(SkillJSONKeys.BUFF_STACKS))
                                stacks = buff[SkillJSONKeys.BUFF_STACKS];
                            let duration = -1;
                            if (buff.hasOwnProperty(SkillJSONKeys.BUFF_DURATION))
                                duration = buff[SkillJSONKeys.BUFF_DURATION];
                            doll.addBuff(buff[SkillJSONKeys.BUFF_NAME], this.name, duration, stacks);
                            // if source has sparkling centerstage, apply 1 stack of gun passive
                            if (this.weaponName == "Sparkling Centerstage")
                                this.applyGunBuffs();
                        });
                    }
                });
                if (skill.hasOwnProperty(SkillJSONKeys.POST_SELF_BUFF)) {
                    let statusEffects = skill[SkillJSONKeys.POST_SELF_BUFF];
                    statusEffects.forEach(buff => {
                        let stacks = 1;
                        if (buff.hasOwnProperty(SkillJSONKeys.BUFF_STACKS))
                            stacks = buff[SkillJSONKeys.BUFF_STACKS];
                        let duration = -1;
                        if (buff.hasOwnProperty(SkillJSONKeys.BUFF_DURATION))
                            duration = buff[SkillJSONKeys.BUFF_DURATION];
                        this.addBuff(buff[SkillJSONKeys.BUFF_NAME], this.name, duration, stacks);
                    });
                }
            }
            else
                this.processPrePostBuffs(skill, supportTarget, null, false);
        }
        // suomi applies 1 stack of avalanche for any active skill use by anyone other than herself
        if ([SkillNames.BASIC, SkillNames.SKILL2, SkillNames.SKILL3, SkillNames.ULT].includes(skillName)) {
            EventManager.getInstance().broadcastEvent("allyAction", this.name);
            // apply the index cost or cooldown of the skill if present, assumed index >= cost when skill is used
            if (skill.hasOwnProperty(SkillJSONKeys.COST))
                this.adjustIndex(-skill[SkillJSONKeys.COST]);
            if (skill.hasOwnProperty(SkillJSONKeys.COOLDOWN)) {
                switch(skillName) {
                    case SkillNames.BASIC:
                        this.cooldowns[0] = skill[SkillJSONKeys.COOLDOWN];
                        break;
                    case SkillNames.SKILL2:
                        this.cooldowns[1] = skill[SkillJSONKeys.COOLDOWN];
                        break;
                    case SkillNames.SKILL3:
                        this.cooldowns[2] = skill[SkillJSONKeys.COOLDOWN];
                        break;
                    case SkillNames.ULT:
                        this.cooldowns[3] = skill[SkillJSONKeys.COOLDOWN];
                        break;
                    default :
                        console.error(`How did ${skillName} make it through the include check`);
                }
            }
        }
        // weapon daydream activates self damage buff after a basic attack
        if (skillName == SkillNames.BASIC && this.weaponName == "Daydream") {
            this.applyGunBuffs();
        }
    }

    endTurn() {
        super.endTurn();
        this.turnAvailable = false;
        // tick down the cooldowns
        for (let i = 0; i < 4; i++) {
            if (this.cooldowns[i] > 0)
                this.cooldowns[i]--;
        }
        // check if extra action was executed and invert the flag
        if (this.executingExtraAction) {
            this.executingExtraAction = false;
            // if weapon is planeta, add the passive stacks
            if (this.weaponName == "Planeta")
                this.applyGunBuffs();
        }
    }

    processAttack(skill, calculationType, target, skillName) {
        // apply gun effect for attacking out of cover target if value is 0
        let coverValue = GameStateManager.getInstance().getCover();
        if (coverValue == 0)
            this.applyGunEffects(WeaponJSONKeys.OUT_OF_COVER);
        // active engagement temporarily changes damage type to electric
        let element = skill[SkillJSONKeys.ELEMENT];
        if (this.hasBuff("Active Engagement") || this.hasBuff("Active Engagement V5"))
            element = Elements.ELECTRIC;
        // check if attack is an active attack or out of turn
        if ([SkillNames.BASIC, SkillNames.SKILL2, SkillNames.SKILL3, SkillNames.ULT].includes(skillName)) {
            // on move gun effects can only activate when performing active attacks as that is the only time you can move before attacking
            this.applyGunEffects(WeaponJSONKeys.ON_MOVE);
            // arctic benediction is only used on active attacks to apply 10 or 20% dmg and 1 stack of frozen
            if (this.hasBuff("Arctic Benediction")) {
                target.addBuff("Frozen", this.name, 2, 1);
                this.damageDealt[StatVariants.ALL] += 0.1;
            } 
            else if (this.hasBuff("Arctic Benediction V1")) {
                target.addBuff("Frozen", this.name, 2, 1);
                this.damageDealt[StatVariants.ALL] += 0.2;
            }
        }

        // WILL HAVE TO TEST LATER IF NO MOVE GUN EFFECTS TRIGGERS ON OUT OF TURN ATTACKS
        this.applyGunEffects(WeaponJSONKeys.NO_MOVE); 
            
        // if weapon is scylla, a buff that only works on aoe corrosion damage exists and the current system does not automatically apply it
        if (element == Elements.CORROSION && skill[SkillJSONKeys.DAMAGE_TYPE] == AttackTypes.AOE)
            this.applyGunEffects(WeaponJSONKeys.AOE_CORROSION);
        // additionally check for the specific element that triggers any weapon bonus effects
        let debuffExploited = false;
        if (target.hasBuffElement(this.getGunElementExploit(), true)) {
            this.applyGunEffects(WeaponJSONKeys.ELEMENTAL_DEBUFF);
            debuffExploited = true;
        }
        // set whether the attack crits or not
        let isCrit;
        let tempCritDmg = this.critDamage[StatVariants.ALL];
        let tempCritRate = this.critChance[StatVariants.ALL];
        // if attack modifies crit, add it before incorporating it into the calculation type
        if (skill.hasOwnProperty(SkillJSONKeys.CRIT_DAMAGE_MODIFIER))
            tempCritDmg += skill[SkillJSONKeys.CRIT_DAMAGE_MODIFIER];
        if (skill.hasOwnProperty(SkillJSONKeys.CRIT_MODIFIER))
            tempCritRate += skill[SkillJSONKeys.CRIT_MODIFIER];
        switch(calculationType) {
            case CalculationTypes.CRIT:
                isCrit = 1;
                // if this is V1+ Makiatto's second shot and the conditional flag is not true, then add the crit damage anyway since critting is the condition to add it
                if (this.name == "Makiatto" && this.fortification > 0 && !skill.hasOwnProperty(SkillJSONKeys.EXTRA_ATTACK) && skill[SkillJSONKeys.CRIT_MODIFIER] != 1
                    && skill[SkillJSONKeys.STABILITYDAMAGE] == 1)
                    tempCritDmg += 0.8;
                break;
            case CalculationTypes.NOCRIT:
                isCrit = 0;
                break;
            case CalculationTypes.EXPECTED: // get the expected value of the attack through linear interpolation from 1 to crit damage using crit rate
                isCrit = 1;
                // the effective value of crit rate should be bounded to 0-1
                tempCritRate = Math.max(Math.min(tempCritRate, 1), 0); 
                tempCritDmg = (tempCritDmg - 1) * tempCritRate + 1; 
                // V1 Makiatto 2nd shot crit modifiers depends on the first shot to crit which messes with the expected value calculations so I have to manually
                // calculate the expected value, first check if this doll is V1+ Makiatto then check if this is the extra attack and lastly check if the conditional
                // override bool has not been ticked, the last one is because that bool tells us whether the first shot crit or only potentially crit
                if (this.name == "Makiatto" && skill[SkillJSONKeys.CRIT_MODIFIER] != 1 && this.fortification > 0 && !skill.hasOwnProperty(SkillJSONKeys.EXTRA_ATTACK)
                    && skill[SkillJSONKeys.STABILITYDAMAGE] == 1) {
                    let noCritRate = 1 - tempCritRate;
                    tempCritDmg = noCritRate * noCritRate; // case 1: Both first and second shots failed to crit
                    tempCritDmg += noCritRate * tempCritRate * this.critDamage[StatVariants.ALL]; // case 2: First shot fails to crit and second shot crits
                    tempCritDmg += tempCritRate * (this.critDamage[StatVariants.ALL] + 0.8);
                }
                break;
            case CalculationTypes.SIMULATION:
                isCrit = RNGManager.getInstance().getRNG() <= tempCritRate; // simulate a crit rng roll
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
                    fixedDamage = this.getDefense();
                    break;
                case "Attack":
                    fixedDamage = this.getAttack();
                    break;
                default:
                    console.error([`${data[SkillJSONKeys.FIXED_DAMAGE_STAT]} fixed damage scaling for ${skillName} is not covered`, this]);
            }
            fixedDamage *= data[SkillJSONKeys.FIXED_DAMAGE_SCALING];
        }
        // get cover ignore of the attack
        let coverIgnore = 0;
        if (skill.hasOwnProperty(SkillJSONKeys.COVER_IGNORE))
            coverIgnore = skill[SkillJSONKeys.COVER_IGNORE];
        // get the temporary freeze damage dealt from v2+ suomi warding light
        if (GameStateManager.getInstance().hasDoll("Suomi")) {
            if (GameStateManager.getInstance().getDoll("Suomi").fortification > 1) {
                if (this.hasBuff("Frost Barrier"))
                    this.elementDamageDealt.Freeze += 0.15;
            }
        }
        // get the temporary damage boost from skill conditionals when triggered
        if (skill.hasOwnProperty(SkillJSONKeys.DAMAGE_BOOST))
            this.damageDealt[StatVariants.ALL] += skill[SkillJSONKeys.DAMAGE_BOOST];
        let damage = DamageManager.getInstance().calculateDamage(this, target, this.getAttack() * skill[SkillJSONKeys.MULTIPLIER], element, 
            skill[SkillJSONKeys.AMMO_TYPE], skill[SkillJSONKeys.DAMAGE_TYPE], isCrit, tempCritDmg, skill[SkillJSONKeys.STABILITYDAMAGE], coverIgnore, skillName);
        if (skill.hasOwnProperty(SkillJSONKeys.DAMAGE_BOOST))
            this.damageDealt[StatVariants.ALL] -= skill[SkillJSONKeys.DAMAGE_BOOST];
        if (GameStateManager.getInstance().hasDoll("Suomi")) {
            if (GameStateManager.getInstance().getDoll("Suomi").fortification > 1) {
                if (this.hasBuff("Frost Barrier"))
                    this.elementDamageDealt.Freeze -= 0.15;
            }
        }
        if (coverValue == 0)
            this.removeGunEffects(WeaponJSONKeys.OUT_OF_COVER);
        // after doing damage, consume any buffs that are reduced on attack
        // for active attacks
        if ([SkillNames.BASIC, SkillNames.SKILL2, SkillNames.SKILL3, SkillNames.ULT].includes(skillName)) {
            if (this.hasBuff("Arctic Benediction"))
                this.damageDealt[StatVariants.ALL] -= 0.1;
            else if (this.hasBuff("Arctic Benediction V1")) 
                this.damageDealt[StatVariants.ALL] -= 0.2;
            this.consumeAttackBuffs();
            // additionally remove on move gun effect
            this.removeGunEffects(WeaponJSONKeys.ON_MOVE);
            // for removing edifice stacks normally
            target.takePrimaryDamage();
        }
        else {
            // for support attacks
            if (skillName == SkillNames.SUPPORT)
                this.consumeSupportBuffs();
            // bittersweet caramel passive stacks are gained by doing out of turn attacks
            if (this.weaponName == "Bittersweet Caramel")
                this.applyGunBuffs();
        }
            
        // add fixed damage
        damage += fixedDamage;
        if (fixedDamage > 0)
            DamageManager.getInstance().applyFixedDamage(fixedDamage, this.name);

        // WILL HAVE TO TEST LATER IF NO MOVE GUN EFFECTS TRIGGERS ON OUT OF TURN ATTACKS
        this.removeGunEffects(WeaponJSONKeys.NO_MOVE); 

        if (element == Elements.CORROSION && skill[SkillJSONKeys.DAMAGE_TYPE] == AttackTypes.AOE)
            this.removeGunEffects(WeaponJSONKeys.AOE_CORROSION);
        if (this.getGunElementExploit() != Elements.PHYSICAL && debuffExploited)
            this.removeGunEffects(WeaponJSONKeys.ELEMENTAL_DEBUFF);
            
        return damage;
    }

    processPrePostBuffs(skill, target, supportTarget, isPreBuff) {
        if (isPreBuff) {
            // if the skill applies buffs before the attack
            if (skill.hasOwnProperty(SkillJSONKeys.PRE_SELF_BUFF)) {
                let statusEffects = skill[SkillJSONKeys.PRE_SELF_BUFF];
                // some skills apply multiple buffs so run a foreach loop to ensure all buffs are applied
                statusEffects.forEach(buff => {
                    let stacks = 1;
                    if (buff.hasOwnProperty(SkillJSONKeys.BUFF_STACKS))
                        stacks = buff[SkillJSONKeys.BUFF_STACKS];
                    let duration = -1;
                    if (buff.hasOwnProperty(SkillJSONKeys.BUFF_DURATION))
                        duration = buff[SkillJSONKeys.BUFF_DURATION];
                    this.addBuff(buff[SkillJSONKeys.BUFF_NAME], this.name, duration, stacks);
                });
            }
            if (skill.hasOwnProperty(SkillJSONKeys.PRE_TARGET_BUFF)) {
                let statusEffects = skill[SkillJSONKeys.PRE_TARGET_BUFF];
                statusEffects.forEach(buff => {
                    let stacks = 1;
                    if (buff.hasOwnProperty(SkillJSONKeys.BUFF_STACKS))
                        stacks = buff[SkillJSONKeys.BUFF_STACKS];
                    let duration = -1;
                    if (buff.hasOwnProperty(SkillJSONKeys.BUFF_DURATION))
                        duration = buff[SkillJSONKeys.BUFF_DURATION];
                    target.addBuff(buff[SkillJSONKeys.BUFF_NAME], this.name, duration, stacks);
                    if (this.weaponName == "Sparkling Centerstage" && target != GameStateManager.getInstance().getTarget().getName())
                        this.applyGunBuffs();
                });
            }
            if (skill.hasOwnProperty(SkillJSONKeys.PRE_SUPPORT_BUFF)) {
                if (supportTarget) {
                    let statusEffects = skill[SkillJSONKeys.PRE_SUPPORT_BUFF];
                    statusEffects.forEach(buff => {
                        let stacks = 1;
                        if (buff.hasOwnProperty(SkillJSONKeys.BUFF_STACKS))
                            stacks = buff[SkillJSONKeys.BUFF_STACKS];
                        let duration = -1;
                        if (buff.hasOwnProperty(SkillJSONKeys.BUFF_DURATION))
                            duration = buff[SkillJSONKeys.BUFF_DURATION];
                        supportTarget.addBuff(buff[SkillJSONKeys.BUFF_NAME], this.name, duration, stacks);
                        // if source has sparkling centerstage, apply 1 stack of gun passive
                        if (this.weaponName == "Sparkling Centerstage")
                            this.applyGunBuffs();
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
                statusEffects.forEach(buff => {
                    let stacks = 1;
                    if (buff.hasOwnProperty(SkillJSONKeys.BUFF_STACKS))
                        stacks = buff[SkillJSONKeys.BUFF_STACKS];
                    let duration = -1;
                    if (buff.hasOwnProperty(SkillJSONKeys.BUFF_DURATION))
                        duration = buff[SkillJSONKeys.BUFF_DURATION];
                    target.addBuff(buff[SkillJSONKeys.BUFF_NAME], this.name, duration, stacks);
                    // if source has sparkling centerstage and buffs non enemies, apply 1 stack of gun passive
                    if (this.weaponName == "Sparkling Centerstage" && target != GameStateManager.getInstance().getTarget().getName())
                        this.applyGunBuffs();
                });
            }
            if (skill.hasOwnProperty(SkillJSONKeys.POST_SELF_BUFF)) {
                let statusEffects = skill[SkillJSONKeys.POST_SELF_BUFF];
                statusEffects.forEach(buff => {
                    let stacks = 1;
                    if (buff.hasOwnProperty(SkillJSONKeys.BUFF_STACKS))
                        stacks = buff[SkillJSONKeys.BUFF_STACKS];
                    let duration = -1;
                    if (buff.hasOwnProperty(SkillJSONKeys.BUFF_DURATION))
                        duration = buff[SkillJSONKeys.BUFF_DURATION];
                    this.addBuff(buff[SkillJSONKeys.BUFF_NAME], this.name, duration, stacks);
                });
            }
            if (skill.hasOwnProperty(SkillJSONKeys.POST_SUPPORT_BUFF)) {
                if (supportTarget) {
                    let statusEffects = skill[SkillJSONKeys.POST_SUPPORT_BUFF];
                    statusEffects.forEach(buff => {
                        let stacks = 1;
                        if (buff.hasOwnProperty(SkillJSONKeys.BUFF_STACKS))
                            stacks = buff[SkillJSONKeys.BUFF_STACKS];
                        let duration = -1;
                        if (buff.hasOwnProperty(SkillJSONKeys.BUFF_DURATION))
                            duration = buff[SkillJSONKeys.BUFF_DURATION];
                        supportTarget.addBuff(buff[SkillJSONKeys.BUFF_NAME], this.name, duration, stacks);
                        // if source has sparkling centerstage, apply 1 stack of gun passive
                        if (this.weaponName == "Sparkling Centerstage")
                            this.applyGunBuffs();
                    });
                }
                else
                    console.error(["Support Target not found for pre-support buff", this]);
            }
        }
    }
    // reduce stacks for any buffs that consume stacks on active attack
    consumeAttackBuffs() {
        this.currentBuffs.forEach((buff) => {
            if (buff[5] == "Attack" || buff[5] == "ActiveAttack") { // check if buff stacks are consumed by any attack or active attacks
                buff[3]--;
                // remove buff if 0 stacks
                if (buff[3] == 0) {
                    this.removeBuff(buff[0]);
                }
                // else check if buff stacks and reduce the effects of 1 stack 
                else if (buff[1].hasOwnProperty(BuffJSONKeys.STACKABLE)) {
                    this.removeBuffEffects(buff[0], 1, true);
                }
                EventManager.getInstance().broadcastEvent("stackConsumption", [this.name, 1, buff[0]]);
            }
            else if (buff[5] == "AllAttack") { // if all stacks are consumed in a single attack rather than gradually
                EventManager.getInstance().broadcastEvent("stackConsumption", [this.name, buff[3], buff[0]]);
                this.removeBuff(buff[0]);
            }
        });
    }
    // reduce stacks for any buffs that consume stacks on support attack
    consumeSupportBuffs() {
        this.currentBuffs.forEach((buff) => {
            if (buff[5] == "Attack" || buff[5] == "Support") { // check if buff stacks are consumed by any attack or support attacks
                buff[3]--;
                // remove buff if 0 stacks
                if (buff[3] == 0) {
                    this.removeBuff(buff[0]);
                }
                // else check if buff stacks and reduce the effects of 1 stack 
                else if (buff[1].hasOwnProperty(BuffJSONKeys.STACKABLE)) {
                    this.removeBuffEffects(buff[0], 1, true);
                }
                EventManager.getInstance().broadcastEvent("stackConsumption", [this.name, 1, buff[0]]);
            }
            else if (buff[5] == "AllAttack") { // if all stacks are consumed in a single attack rather than gradually
                EventManager.getInstance().broadcastEvent("stackConsumption", [this.name, buff[3], buff[0]]);
                this.removeBuff(buff[0]);
            }
        });
    }
    // because fortification will modify the skill json, we need a copy of it rather than a reference to the resourceloader's to prevent unintended effects
    copySkillJSON() {
        let newJSON = {};
        // iterate through each skill
        Object.keys(this.skillData).forEach(skill => {
            // each skill key has an object value
            newJSON[skill] = this.copyNestedObject(this.skillData[skill]);
        });

        this.skillData = newJSON;
    }
    // buffs are made as arrays of objects
    copyBuffArray(arr) {
        let newArr = [];
        arr.forEach(d => {
            newArr.push(this.copyNestedObject(d));
        });
        return newArr;
    }
    // copies skill data, buffs, conditionals, or extra attacks for playing around without changing the original variable
    copyNestedObject(obj) {
        let newObj = {};
        Object.keys(obj).forEach(d => {
            // conditionals and skill buffs contain arrays of objects
            if (obj[d].constructor == Array)
                newObj[d] = this.copyBuffArray(obj[d]);
            // if the key is fixed_damage or extra_attack, copy the nested object values
            else if (d == SkillJSONKeys.FIXED_DAMAGE || d == SkillJSONKeys.EXTRA_ATTACK)
                newObj[d] = this.copyNestedObject(obj[d]);
            else
                newObj[d] = obj[d];
        });
        return newObj;
    }
    // merges skill data with conditional or key modifications
    mergeData(skillData, modification) {
        // check if the modification appends or overwrites, append nests the keys as values with an append key
        Object.keys(modification).forEach(key => {
            // skip over condition text since that is not meant to be used outside of display purposes
            if (key != SkillJSONKeys.CONDITION_TEXT) {
                // if the key is append, get the nested object to be added into the array belonging to the key rather than overwrite
                if (key == SkillJSONKeys.APPEND) {
                    Object.keys(modification[key]).forEach(append_key => {
                        // check if array at key already exists, in the case of v0 qj there is none but v1 has hence why append is used for her key modification
                        if (skillData.hasOwnProperty(append_key)) {
                            // sometimes multiple elements are to be appended in the array
                            modification[key][append_key].forEach(obj => {
                                skillData[append_key].push(obj);
                            });
                        }
                        else {
                            let newArr = [];
                            modification[key][append_key].forEach(obj => {
                                newArr.push(obj);
                            });
                            skillData[append_key] = newArr;
                        }
                    });
                }
                else {
                    // if damage boost, add up the damage instead of replacing
                    if (key != SkillJSONKeys.DAMAGE_BOOST || !skillData.hasOwnProperty(key)) {
                        if (modification[key].constructor == Array)
                            skillData[key] = this.copyBuffArray(modification[key])
                        else
                            skillData[key] = modification[key];
                    }
                    else 
                        skillData[key] += modification[key];
                }
            }
        });
    }
    // to enable turn rewinding, each move uses clones of the previous state and rewind just returns to that set of clones
    cloneUnit(newDoll = null) {
        if (!newDoll)
            newDoll = new Doll(this.name, this.defense, this.attack, this.baseCritChance[StatVariants.ALL], this.baseCritDamage[StatVariants.ALL], this.fortification, this.keysEnabled, this.weaponName, this.weaponCalib, this.hasPhaseStrike);   
        newDoll.CIndex = this.CIndex;
        //newDoll.setDefenseIgnore(this.baseDefenseIgnore[StatVariants.ALL], StatVariants.ALL);
        let variants = Object.values(StatVariants);
        variants.forEach(variant => {
            newDoll.setDefenseIgnore(this.baseDefenseIgnore[variant], variant);
            newDoll.setDamageDealt(this.baseDamageDealt[variant], variant);
            newDoll.setCritRate(this.baseCritChance[variant], variant);
            newDoll.setCritDamage(this.baseCritDamage[variant], variant);
            newDoll.setStabilityDamageModifier(this.baseStabilityDamageModifier[variant], variant);
        });
        //newDoll.setDamageDealt(this.baseDamageDealt[StatVariants.ALL], StatVariants.ALL); 
        //newDoll.setAoEDamage(this.baseAoEDamageDealt, StatVariants.ALL); 
        //newDoll.setTargetedDamage(this.baseTargetedDamageDealt, StatVariants.ALL); 
        newDoll.setSlowedDamage(this.baseSlowedDamageDealt);
        newDoll.setDefDownDamage(this.baseDefDownDamageDealt);
        newDoll.setExposedDamage(this.baseExposedDamageDealt);
        newDoll.setSupportDamage(this.baseSupportDamageDealt); 
        /*newDoll.setPhaseDamage(this.basePhaseDamageDealt, StatVariants.ALL); 
        Object.values(Elements).forEach(d => {
            newDoll.setElementDamage(d, this.baseElementDamageDealt[d]);
        });*/
        newDoll.setCoverIgnore(this.baseCoverIgnore); 
        //newDoll.setStabilityDamageModifier(this.baseStabilityDamageModifier[StatVariants.ALL]);
        newDoll.setStabilityIgnore(this.baseStabilityIgnore);
        newDoll.setAttackBoost(this.baseAttackBoost);
        newDoll.setDefenseBuffs(this.baseDefenseBuffs);

        if (!this.buffsEnabled)
            newDoll.disableBuffs();
        else {
            this.currentBuffs.forEach(buff => {
                newDoll.addBuff(buff[0], buff[6], buff[2], buff[3]);
            });
            this.buffImmunity.forEach(immunity => {
                newDoll.buffImmunity.push(immunity);
            });
        }
        // copy the values of the cooldown rather than passing a reference to the array
        let cds = [];
        for (let i = 0; i < 4; i++)
            cds.push(this.cooldowns[i]);
        newDoll.cooldowns = cds;
        newDoll.turnAvailable = this.turnAvailable;
        newDoll.executingExtraAction = this.executingExtraAction;

        newDoll.finishCloning();
        return newDoll;
    }
    // to be filled by child classes
    startTurn() {
        this.turnAvailable = true;
        super.startTurn();
    }
    // to ensure index consumption/gain does not exceed the bounds of 0-6
    adjustIndex(gain) {
        this.CIndex = Math.max(Math.min(6, this.CIndex + gain), 0);
    }
}

export default Doll;