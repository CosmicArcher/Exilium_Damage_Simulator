import Unit from "./Unit.js";
import ResourceLoader from "./ResourceLoader.js";
import { SkillNames, CalculationTypes, SkillJSONKeys, Elements } from "./Enums.js";
import GameStateManager from "./GameStateManager.js";
import DamageManager from "./DamageManager.js";
import RNGManager from "./RNGManager.js";
import EventManager from "./EventManager.js";

class Doll extends Unit {
    constructor(name, defense, attack, crit_chance, crit_damage, fortification, keys = [0,0,0,0,0,0]) {
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
        this.slowedDamageDealt = 0;
        this.defDownDamageDealt = 0;
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
        this.stabilityIgnore = 0;
        // base values changed by direct input rather than automatic from buff applications
        this.baseDefenseIgnore = 0;
        this.baseDamageDealt = 0;
        this.baseAoEDamageDealt = 0;
        this.baseTargetedDamageDealt = 0;
        this.baseExposedDamageDealt = 0;
        this.baseSlowedDamageDealt = 0;
        this.baseDefDownDamageDealt = 0;
        this.baseSupportDamageDealt = 0;
        this.basePhaseDamageDealt = 0;
        this.baseElementDamageDealt = {
            "Freeze" : 0,
            "Burn" : 0,
            "Corrosion" : 0,
            "Hydro" : 0,
            "Electric" : 0,
            "Physical" : 0
        };
        this.baseCoverIgnore = 0;
        this.baseStabilityDamageModifier = 0;
        this.baseStabilityIgnore = 0;
        // keys will be arranged numerically
        this.keysEnabled = keys;

        this.turnAvailable = true;

        this.initializeSkillData();
        // merge the skill json with the fortification and key modifications of skills
        this.applyFortificationData();
        this.applyKeyData()
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
    getSlowedDamage() {return this.slowedDamageDealt;}
    getDefDownDamage() {return this.defDownDamageDealt;}
    getSupportDamage() {return this.supportDamageDealt;}
    getPhaseDamage() {return this.phaseDamageDealt;}
    getElementDamage(elementName) {return this.elementDamageDealt[elementName];}
    getCoverIgnore() {return this.coverIgnore;}
    getStabilityDamageModifier() {return this.stabilityDamageModifier;}
    getStabilityIgnore() {return this.stabilityIgnore;}
    // get the base stats for display mid-simulation
    getBaseDefenseIgnore() {return this.baseDefenseIgnore;}
    getBaseDamageDealt() {return this.baseDamageDealt;}
    getBaseTargetedDamage() {return this.baseTargetedDamageDealt;}
    getBaseAoEDamage() {return this.baseAoEDamageDealt;}
    getBaseExposedDamage() {return this.baseExposedDamageDealt;}
    getBaseSlowedDamage() {return this.baseSlowedDamageDealt;}
    getBaseDefDownDamage() {return this.baseDefDownDamageDealt;}
    getBaseSupportDamage() {return this.baseSupportDamageDealt;}
    getBasePhaseDamage() {return this.basePhaseDamageDealt;}
    getBaseElementDamage(elementName) {return this.baseElementDamageDealt[elementName];}
    getBaseCoverIgnore() {return this.baseCoverIgnore;}
    getBaseStabilityDamageModifier() {return this.baseStabilityDamageModifier;}
    getBaseStabilityIgnore() {return this.baseStabilityIgnore;}
    // for direct buff input
    setDefenseIgnore(x) {
        this.resetDefenseIgnore();
        this.baseDefenseIgnore = x;
        this.defenseIgnore += x;
    }
    setDamageDealt(x) {
        this.resetDamageDealt();
        this.baseDamageDealt = x;
        this.damageDealt += x;
    }
    setAoEDamage(x) {
        this.resetAoEDamage();
        this.baseAoEDamageDealt = x;
        this.aoeDamageDealt += x;
    }
    setTargetedDamage(x) {
        this.resetTargetedDamage();
        this.baseTargetedDamageDealt = x;
        this.targetedDamageDealt += x;
    }
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
    setPhaseDamage(x) {
        this.resetPhaseDamage();
        this.basePhaseDamageDealt = x;
        this.phaseDamageDealt += x;
    }
    setElementDamage(elementName, x) {
        this.resetElementDamage(elementName);
        this.baseElementDamageDealt[elementName] = x;
        this.elementDamageDealt[elementName] += x;
    }
    setCoverIgnore(x) {
        this.resetCoverIgnore();
        this.baseCoverIgnore = x;
        this.coverIgnore += x;
    }
    setStabilityDamageModifier(x) {
        this.resetStabilityDamageModifier();
        this.baseStabilityDamageModifier = x;
        this.stabilityDamageModifier += x;
    }
    setStabilityIgnore(x) {
        this.resetStabilityIgnore();
        this.baseStabilityIgnore = x;
        this.stabilityIgnore += x;
    }
    // when using the setters, undo the addition of the previous base multipliers
    resetDefenseIgnore() {
        this.defenseIgnore -= this.baseDefenseIgnore;
        this.baseDefenseIgnore = 0;
    }
    resetDamageDealt() {
        this.damageDealt -= this.baseDamageDealt;
        this.baseDamageDealt = 0;
    }
    resetAoEDamage() {
        this.aoeDamageDealt -= this.baseAoEDamageDealt;
        this.baseAoEDamageDealt = 0;
    }
    resetTargetedDamage() {
        this.targetedDamageDealt -= this.baseTargetedDamageDealt;
        this.baseTargetedDamageDealt = 0;
    }
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
    resetPhaseDamage() {
        this.phaseDamageDealt -= this.basePhaseDamageDealt;
        this.basePhaseDamageDealt = 0;
    }
    resetElementDamage(elementName) {
        this.elementDamageDealt[elementName] -= this.baseElementDamageDealt[elementName];
        this.baseElementDamageDealt[elementName] = 0;
    }
    resetCoverIgnore() {
        this.coverIgnore -= this.baseCoverIgnore;
        this.baseCoverIgnore = 0;
    }
    resetStabilityDamageModifier() {
        this.stabilityDamageModifier -= this.baseStabilityDamageModifier;
        this.baseStabilityDamageModifier = 0;
    }
    resetStabilityIgnore() {
        this.stabilityIgnore -= this.baseStabilityIgnore;
        this.baseStabilityIgnore = 0;
    }
    // get the data belonging to the doll from the loaded jsons
    initializeSkillData() {
        this.skillData = ResourceLoader.getInstance().getSkillData(this.name);
        this.fortData = ResourceLoader.getInstance().getFortData(this.name);
        this.keyData = ResourceLoader.getInstance().getKeyData(this.name);
        // change skilldata from a reference to resource loader's json to directly having its own copy of the values
        this.copySkillJSON();
    }
    // merge the upgrades from fortification into skill data
    applyFortificationData() {
        for (let i = 1; i <= this.fortification; i++) {
            // check if the fortification level modifies skill data
            if (this.fortData.hasOwnProperty("V" + i)) {
                let fortification = this.fortData["V" + i];
                // some fortifications modify multiple skills at once, typically by modifying a unique buff that multiple skills apply
                let fortificationSkills = Object.keys(fortification);
                if (fortificationSkills.length > 1) {
                    fortificationSkills.forEach(skill_name => {
                        this.mergeData(this.skillData[skill_name], fortification[skill_name]);
                    });
                }
                else {
                    this.mergeData(this.skillData[fortificationSkills[0]], fortification[fortificationSkills[0]]);
                }
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
    // get the attack type of the skill 
    getSkillAttackType(skillName) {
        if (this.skillData.hasOwnProperty(skillName)) 
            return this.skillData[skillName][SkillJSONKeys.DAMAGE_TYPE];
        console.error(`${skillName} is not in ${this.name}'s skill names`);
    }
    // process buffs using json data
    applyBuffEffects(buffData) {
        super.applyBuffEffects(buffData);
        if(buffData.hasOwnProperty("DamagePerc"))
            this.damageDealt += buffData["DamagePerc"];
        if(buffData.hasOwnProperty("AoEDamageTaken%"))
            this.aoeDamageTaken += buffData["AoEDamageTaken%"];
        if(buffData.hasOwnProperty("TargetedDamageTaken%"))
            this.targetedDamageTaken += buffData["TargetedDamageTaken%"];
    }
    removeBuffEffects(buffData) {
        super.removeBuffEffects(buffData);
        if(buffData.hasOwnProperty("DamagePerc"))
            this.damageDealt -= buffData["DamagePerc"];
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
            this.processPrePostBuffs(skill, enemyTarget, supportTarget, 1);
            // if out of turn attack, temporarily increase damage dealt stat then undo once damage has been calculated
            if (skillName == SkillNames.SUPPORT || skillName == SkillNames.COUNTERATTACK || skillName == SkillNames.INTERCEPT)
                this.damageDealt += this.supportDamageDealt;
            let damage = this.processAttack(skill, calculationType, enemyTarget);
            if (skillName == SkillNames.SUPPORT || skillName == SkillNames.COUNTERATTACK || skillName == SkillNames.INTERCEPT)
                this.damageDealt -= this.supportDamageDealt;

            this.processPrePostBuffs(skill, enemyTarget, supportTarget, 0);
            // some skills have an extra attack which, unless stated otherwise, have the same data as the first attack 
            if (skill.hasOwnProperty(SkillJSONKeys.EXTRA_ATTACK)) {
                let extraAttack = skill[SkillJSONKeys.EXTRA_ATTACK];

                this.processPrePostBuffs(extraAttack, enemyTarget, supportTarget, 1);

                damage += this.processAttack(extraAttack, calculationType, enemyTarget);

                this.processPrePostBuffs(extraAttack, enemyTarget, supportTarget, 0);
            }
            // end turn and decrease counters on buffs if extra command or movement is not triggered
            if (!(this.hasBuff("Extra Command") || this.hasBuff("Extra Movement")))
                this.endTurn();
            // extra action counts down on buff duration but enables another turn
            if (this.hasBuff("Extra Action"))
                this.turnAvailable = true;

            
        }
        // if a buffing skill rather than attack, process buff data with supportTarget in the target parameter
        else {
            this.processPrePostBuffs(skill, supportTarget, null, 1);
            // end turn and decrease counters on buffs if extra command or movement is not triggered
            if (!(this.hasBuff("Extra Command") || this.hasBuff("Extra Movement")))
                this.endTurn();
            // extra action counts down on buff duration but enables another turn
            if (this.hasBuff("Extra Action"))
                this.turnAvailable = true;

            if (skill[SkillJSONKeys.BUFF_TARGET] == "All") {
                GameStateManager.getInstance().getAllDolls().forEach(doll => {
                    this.processPrePostBuffs(skill, doll, null, 0);
                });
            }
            else
                this.processPrePostBuffs(skill, supportTarget, null, 0);

            console.log(this.currentBuffs);
        }
        // suomi applies 1 stack of avalanche for any active skill use by anyone other than herself
        if ([SkillNames.BASIC, SkillNames.SKILL2, SkillNames.SKILL3, SkillNames.ULT].includes(skillName)) {
            EventManager.getInstance().broadcastEvent("allyAction", this.name);
        }
    }

    endTurn() {
        super.endTurn();
        this.turnAvailable = false;
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
                    tempCritDmg += noCritRate * tempCritRate * this.crit_damage; // case 2: First shot fails to crit and second shot crits
                    tempCritDmg += tempCritRate * (this.crit_damage + 0.8);
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
        // get the temporary damage boost from skill conditionals when triggered
        if (skill.hasOwnProperty(SkillJSONKeys.DAMAGE_BOOST))
            this.damageDealt += skill[SkillJSONKeys.DAMAGE_BOOST];
        let damage = DamageManager.getInstance().calculateDamage(this, target, this.attack * skill[SkillJSONKeys.MULTIPLIER], skill[SkillJSONKeys.ELEMENT], 
            skill[SkillJSONKeys.AMMO_TYPE], skill[SkillJSONKeys.DAMAGE_TYPE], isCrit, tempCritDmg, skill[SkillJSONKeys.STABILITYDAMAGE], coverIgnore);
        if (skill.hasOwnProperty(SkillJSONKeys.DAMAGE_BOOST))
            this.damageDealt -= skill[SkillJSONKeys.DAMAGE_BOOST];
        // after doing damage, consume any buffs that are reduced on attack
        this.consumeAttackBuffs();

        damage += fixedDamage;
        if (fixedDamage > 0)
            DamageManager.getInstance().applyFixedDamage(fixedDamage, this.name);

        return damage;
    }

    processPrePostBuffs(skill, target, supportTarget, isPreBuff) {
        if (isPreBuff) {
            // if the skill applies buffs before the attack
            if (skill.hasOwnProperty(SkillJSONKeys.PRE_SELF_BUFF)) {
                let statusEffects = skill[SkillJSONKeys.PRE_SELF_BUFF];
                // some skills apply multiple buffs so run a foreach loop to ensure all buffs are applies
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
                    });
                }
                else
                    console.error(["Support Target not found for pre-support buff", this]);
            }
        }
    }
    // reduce stacks for any buffs that consume stacks on attack
    consumeAttackBuffs() {
        this.currentBuffs.forEach((buff) => {
            if (buff[5] == "Attack") { // check if buff stacks are consumed by defending
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
            // sometimes conditional contains buff array modifications so some values are arrays of objects
            if (obj[d].constructor == Array)
                newObj[d] = this.copyBuffArray(obj[d]);
            // if the key is fixed_damage, conditional or extra_attack, copy the nested object values
            else if (d == SkillJSONKeys.FIXED_DAMAGE || d == SkillJSONKeys.CONDITIONAL || d == SkillJSONKeys.EXTRA_ATTACK)
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
                    skillData[key] = modification[key];
                }
            }
        });
    }
    // to enable turn rewinding, each move uses clones of the previous state and rewind just returns to that set of clones
    cloneUnit(newDoll) {
        if (!newDoll)
            newDoll = new Doll(this.name, this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification, this.keysEnabled);
        newDoll.CIndex = this.CIndex;
        newDoll.setDefenseIgnore(this.baseDefenseIgnore);
        newDoll.setDamageDealt(this.baseDamageDealt); 
        newDoll.setAoEDamage(this.baseAoEDamageDealt); 
        newDoll.setTargetedDamage(this.baseTargetedDamageDealt); 
        newDoll.setSlowedDamage(this.baseSlowedDamageDealt);
        newDoll.setDefDownDamage(this.baseDefDownDamageDealt);
        newDoll.setExposedDamage(this.baseExposedDamageDealt);
        newDoll.setSupportDamage(this.baseSupportDamageDealt); 
        newDoll.setPhaseDamage(this.basePhaseDamageDealt); 
        Object.values(Elements).forEach(d => {
            newDoll.setElementDamage(d, this.baseElementDamageDealt[d]);
        });
        newDoll.setCoverIgnore(this.baseCoverIgnore); 
        newDoll.setStabilityDamageModifier(this.baseStabilityDamageModifier);
        newDoll.setStabilityIgnore(this.baseStabilityIgnore);

        if (!this.buffsEnabled)
            newDoll.disableBuffs();
        else {
            this.currentBuffs.forEach(buff => {
                newDoll.addBuff(buff[0], buff[2], buff[3], buff[6]);
            });
            this.buffImmunity.forEach(immunity => {
                newDoll.buffImmunity.push(immunity);
            });
        }
        newDoll.finishCloning();
        return newDoll;
    }
}

export default Doll;