import ResourceLoader from "./ResourceLoader.js";
import DamageManager from "./DamageManager.js";
import EventManager from "./EventManager.js";
import { AmmoTypes, AttackTypes, BuffJSONKeys, Elements, CalculationTypes, StatVariants } from "./Enums.js";
import GameStateManager from "./GameStateManager.js";
import TurnManager from "./TurnManager.js";
// root class for dolls (attackers) and targets (defenders)
class Unit {
    constructor(name, defense) { // some dolls use their defense stats for damage
        this.name = name;
        this.defense = defense;
        // stat buffs that are important for both target and attacker
        this.defenseBuffs = 0;
        this.baseDefenseBuffs = 0;
        // track buff name, buff data, turns left, stacks left, isTurnBased, consumption mode, sourceName (for overburn damage)
        this.currentBuffs = [];
        // some modes of the calculator will be purely manual input of buff effects while others will be automatic from the addBuff() function
        this.buffsEnabled = 1;
        // flag to disable event broadcasting of buff applications while copying buffs from original to clone
        this.cloning = true;
        // bosses are immune to certain buffs
        this.buffImmunity = [];
    }

    setDefense(x) {this.defense = x;}
    getDefense() {return this.defense * (1 + this.defenseBuffs);}
    getBaseDefense() {return this.defense;}
    getBaseDefenseBuffs() {return this.baseDefenseBuffs;}
    getName() {return this.name;}
    // process buffs using json data
    applyBuffEffects(buffData, stacks = 1, stackable = false) {
        if(buffData.hasOwnProperty(BuffJSONKeys.DEFENSE_PERC)) {
            if (stackable)
                this.defenseBuffs += buffData[BuffJSONKeys.DEFENSE_PERC] * stacks;
            else 
                this.defenseBuffs += buffData[BuffJSONKeys.DEFENSE_PERC];
        }
    }
    removeBuffEffects(buffData, stacks = 1, stackable = false) {
        if(buffData.hasOwnProperty("DefensePerc")){
            if (stackable)
                this.defenseBuffs -= buffData["DefensePerc"] * stacks;
            else 
                this.defenseBuffs -= buffData["DefensePerc"];
        }
    }
    // for alerting DoT damage application to the turn manager since peritya support will trigger in between corrosive infusion and toxic infiltration procs
    applyDoT(buffName, sourceName) {
        TurnManager.getInstance().activateDoT(buffName, sourceName);
    }
    // for taking the DoT damage itself, should only be called by the turn manager
    takeDoTDamage(buffName, sourceName) {
        let attacker = GameStateManager.getInstance().getDoll(sourceName);
        if (buffName == "Overburn") {
            DamageManager.getInstance().applyFixedDamage(attacker.getAttack() * 0.1, sourceName);
        }
        // toxic infiltration and corrosive infusion are capable of critting and scale with damage dealt buffs so treat it like a normal skill calculation
        else if (buffName == "Corrosive Infusion" || buffName == "Corrosive Infusion V2") {
            let doll = GameStateManager.getInstance().getDoll(sourceName);
            let calcType = GameStateManager.getInstance().getDollCalcType(sourceName);
            let isCrit;
            let tempCritDmg = doll.getCritDamage();
            switch(calcType) {
                case CalculationTypes.CRIT:
                    isCrit = 1;
                    break;
                case CalculationTypes.NOCRIT:
                    isCrit = 0;
                    break;
                case CalculationTypes.EXPECTED: // get the expected value of the attack through linear interpolation from 1 to crit damage using crit rate
                    isCrit = 1;
                    // the effective value of crit rate should be bounded to 0-1
                    let tempCritRate = Math.max(Math.min(doll.getCritRate(), 1), 0); 
                    tempCritDmg = (tempCritDmg - 1) * tempCritRate + 1; 
                    break;
                case CalculationTypes.SIMULATION:
                    isCrit = RNGManager.getInstance().getRNG() <= doll.getCritRate(); // simulate a crit rng roll
                    break;
                default:
                    console.error(`${calculationType} is not a valid calculation type`);
            }
            // corrosive infusion damage scales with stack count
            let dotStacks = 0;
            for (let i = 0; i < this.currentBuffs.length && dotStacks == 0; i++) {
                if (this.currentBuffs[i][0] == buffName)
                    dotStacks = this.currentBuffs[i][3];
            }
            // klukai key 3 adds a 15% dmg buff on corrosive infusion if the target is stability broken
            if (doll.getKeyEnabled(2) && this.stability == 0)
                doll.setDamageDealt(doll.getDamageDealt(StatVariants.ALL) + 0.15, StatVariants.ALL);
            // skillname argument is only used for broadcasting the skill name for dps statistics so it is fine to go outside of the SkillNames enum
            DamageManager.getInstance().calculateDamage(doll, this, doll.getAttack() * 0.12 * dotStacks, Elements.CORROSION, AmmoTypes.NONE,
                                                        AttackTypes.AOE, isCrit, tempCritDmg, 0, 1, "Corrosive Infusion");
                                                        
            if (doll.getKeyEnabled(2) && this.stability == 0)
                doll.setDamageDealt(doll.getDamageDealt(StatVariants.ALL) - 0.15, StatVariants.ALL);
        }
        else if (buffName == "Toxic Infiltration") {
            let doll = GameStateManager.getInstance().getDoll(sourceName);
            let calcType = GameStateManager.getInstance().getDollCalcType(sourceName);
            let isCrit;
            let tempCritDmg = doll.getCritDamage();
            switch(calcType) {
                case CalculationTypes.CRIT:
                    isCrit = 1;
                    break;
                case CalculationTypes.NOCRIT:
                    isCrit = 0;
                    break;
                case CalculationTypes.EXPECTED: // get the expected value of the attack through linear interpolation from 1 to crit damage using crit rate
                    isCrit = 1;
                    // the effective value of crit rate should be bounded to 0-1
                    let tempCritRate = Math.max(Math.min(doll.getCritRate(), 1), 0); 
                    tempCritDmg = (tempCritDmg - 1) * tempCritRate + 1; 
                    break;
                case CalculationTypes.SIMULATION:
                    isCrit = RNGManager.getInstance().getRNG() <= doll.getCritRate(); // simulate a crit rng roll
                    break;
                default:
                    console.error(`${calculationType} is not a valid calculation type`);
            }
            // toxic infiltration damage increases at v5
            let dotMulti = doll.getFortification() > 4 ? 0.8 : 0.6;
            // skillname argument is only used for broadcasting the skill name for dps statistics so it is fine to go outside of the SkillNames enum
            DamageManager.getInstance().calculateDamage(doll, this, doll.getAttack() * dotMulti, Elements.CORROSION, AmmoTypes.NONE,
                                                        AttackTypes.AOE, isCrit, tempCritDmg, 0, 1, "Toxic Infiltration");
            // key 6 applies 1 stack of corrosive infusion after toxic infiltration triggers and the target survives which is always assumed
            if (doll.getKeyEnabled(5)) {
                if (doll.getFortification() > 1)
                    this.addBuff("Corrosive Infusion V2", "Klukai", 2, 1);
                else
                    this.addBuff("Corrosive Infusion", "Klukai", 2, 1);
            }
        }
    }
    // these are called when buffs are added/removed
    addBuff(buffName, sourceName, duration = -1, stacks = 1) {
        let buffData = ResourceLoader.getInstance().getBuffData(buffName);
        if (buffData.hasOwnProperty(BuffJSONKeys.ELEMENT) && buffName != "Avalanche") {
            // freeze debuffs attempted to be applied while having avalanche add another stack, regardless of whether the target is immune to the freeze debuff
            if (this.hasBuff("Avalanche") && buffData[BuffJSONKeys.ELEMENT] == Elements.FREEZE && buffData[BuffJSONKeys.BUFF_TYPE] == "Debuff")
                this.addBuff("Avalanche", "Suomi", -1, 1);
        } 
        if (buffData && this.buffsEnabled && !this.buffImmunity.includes(buffName)) {
            // check if the name is cleanse, instead of adding to buffs, remove buffs equal to cleanse stacks
            if (buffName == "Cleanse") {
                // remove the first stackCount buffs that are cleansable
                let cleanseNames = [];
                for (let i = 0; i < this.currentBuffs.length && cleanseNames.length < stacks; i++) {
                    // only cleanse buffs
                    if (this.currentBuffs[i][1][BuffJSONKeys.BUFF_TYPE] == "Buff")  {
                        if (this.currentBuffs[i][1][BuffJSONKeys.CLEANSEABLE])
                            cleanseNames.push(this.currentBuffs[i][0]);
                    }
                }
                cleanseNames.forEach(buff => {
                    this.removeBuff(buff);
                    // cleansing edifice grants all dolls 1 stack of siege buff
                    if (buff == "Edifice") {
                        let dolls = GameStateManager.getInstance().getAllDolls();
                        dolls.forEach(doll => {
                            doll.addBuff("Siege", this.name, -1, 1);
                        });
                    }
                });
            }
            else {
                // default values if not turn based or stacking skill
                if (buffData[BuffJSONKeys.TURN_BASED] == "None")
                    duration = -1;
                if (!buffData.hasOwnProperty(BuffJSONKeys.STACK_LIMIT))
                    stacks = 1;
                // check if the unit already has the buff
                let index = -1;
                // check if another buff of the same group already exists and resolve the conflict using the priority value
                let groupConflictResolution = -1; // take -1 for no conflict, 0 for discard new buff, 1 for replace existing buff
                for (let i = 0; i < this.currentBuffs.length && groupConflictResolution == -1 && index == -1; i++) {
                    if (this.currentBuffs[i][0] == buffName)
                        index = i;
                    // first check if another buff in the same group exists
                    else if (this.currentBuffs[i][1][BuffJSONKeys.GROUP] == buffData[BuffJSONKeys.GROUP]) {
                        // check if the new buff has a higher (lower number) priority than the existing buff, replace if true, discard new buff if same or lower prio
                        if (this.currentBuffs[i][1][BuffJSONKeys.PRIORITY] > buffData[BuffJSONKeys.PRIORITY]) {
                            groupConflictResolution = 1;
                            // remove existing buff of lower priority then exit the loop to add the new buff
                            this.removeBuff(this.currentBuffs[i][0]);
                        }
                        // if new buff has lower or equal priority to existing buff, do not add the new buff anymore
                        else
                            groupConflictResolution = 0;
                    }
                }
                // proceed with adding the buff if resolution was not to discard it
                if (groupConflictResolution != 0) {
                    let stackGain = stacks;
                    // if does not currently have the buff, add to the list
                    if (index == -1) {
                        this.currentBuffs.push([buffName, buffData, duration, stacks, buffData[BuffJSONKeys.TURN_BASED], buffData[BuffJSONKeys.CONSUMPTION_MODE], sourceName]);
                        this.applyBuffEffects(buffData, stacks, buffData.hasOwnProperty(BuffJSONKeys.STACKABLE));
                        if (buffName == "Murderous Intent") {
                            this.buffImmunity.push("Frozen");
                            this.buffImmunity.push("Frigid");
                        }
                    }
                    else {
                        let buff = this.currentBuffs[index];
                        // check if the buff is turn-based, refresh the duration to the higher of the application or current duration
                        if (buff[4] != "None") {
                            buff[2] = Math.max(buff[2], duration);
                        }
                        // if the buff is below its stack limit, increase the stack count based on the stacks parameter
                        if (buffData.hasOwnProperty(BuffJSONKeys.STACK_LIMIT)) {
                            // permanent tuning stacks count towards tuning 10 stack limit
                            if (buffName == "Tuning") {
                                let permTuningStacks = 0;
                                for (let i = 0; i < this.currentBuffs.length; i++) {
                                    if (this.currentBuffs[i][0].match("Permanent Tuning"))
                                        permTuningStacks = this.currentBuffs[i][3];
                                }
                                if (buff[3] + permTuningStacks < buffData[BuffJSONKeys.STACK_LIMIT]) {
                                    stackGain = Math.min(buffData[BuffJSONKeys.STACK_LIMIT] - buff[3] - permTuningStacks, stacks);
                                    buff[3] += stackGain;
                                    this.applyBuffEffects(buffData, stackGain, true);
                                }
                            }
                            else {
                                if (buff[3] < buffData[BuffJSONKeys.STACK_LIMIT]) {
                                    stackGain = Math.min(buffData[BuffJSONKeys.STACK_LIMIT] - buff[3], stacks);
                                    buff[3] += stackGain;
                                    if (buffData.hasOwnProperty(BuffJSONKeys.STACKABLE))
                                        this.applyBuffEffects(buffData, stackGain, true);
                                }
                            }
                        }
                        // if the overburn sources are different, keep track of the one with higher attack
                        if (buffName == "Overburn" && sourceName != buff[6]) {
                            let dolls = [GameStateManager.getInstance().getDoll(sourceName), GameStateManager.getInstance().getDoll(buff[6])];
                            if (dolls[0].getAttack() > dolls[1].getAttack())
                                buff[6] = sourceName;
                        }
                    }
                    if (!this.cloning) {
                        EventManager.getInstance().broadcastEvent("statusApplied", [sourceName, this.name, buffName, stackGain]);
                        // we also do not want overburn application damage to trigger while cloning
                        if (buffName == "Overburn") {
                            let attacker = GameStateManager.getInstance().getDoll(sourceName);
                            DamageManager.getInstance().applyFixedDamage(attacker.getAttack() * 0.1, sourceName);
                        }
                    }
                }
            }
        }
    }
    removeBuff(buffName) {
        // sanity check by checking if the buff exists in the array first
        this.currentBuffs.forEach((buff,i) => {
            if (buff[0] == buffName) {
                // sometimes stackable buffs are removed through running out of stacks which would result in the remove effect being 0
                // cover that case by removing at least 1 stack always
                this.removeBuffEffects(buff[1], Math.max(buff[3], 1), buff[1].hasOwnProperty(BuffJSONKeys.STACKABLE));
                this.currentBuffs.splice(i, 1);
                return; // exit loop early once buff has been found
            }
        });
    }
    // for checking if a specific buff is on the unit
    hasBuff(buffName) {
        for (let i = 0; i < this.currentBuffs.length; i++) {
            if (this.currentBuffs[i][0] == buffName)
                return true;
        }
        return false;
    }
    // for checking if any buff/debuff of a certain type is on the unit
    hasBuffType(type, isDebuff = true) {
        for (let i = 0; i < this.currentBuffs.length; i++) {
            if (this.currentBuffs[i][1].hasOwnProperty(BuffJSONKeys.STAT)) {
                if (this.currentBuffs[i][1][BuffJSONKeys.STAT] == type) {
                    if (isDebuff) {
                        if (this.currentBuffs[i][1][BuffJSONKeys.BUFF_TYPE] == "Debuff")
                            return true;
                    }
                    else {
                        if (this.currentBuffs[i][1][BuffJSONKeys.BUFF_TYPE] == "Buff")
                            return true;
                    }
                }
            }
        }
        return false;
    }
    // for checking if any buff/debuff of a certain element is on the unit
    hasBuffElement(element, isDebuff = true) {
        for (let i = 0; i < this.currentBuffs.length; i++) {
            if (this.currentBuffs[i][1].hasOwnProperty(BuffJSONKeys.ELEMENT)) {
                if (this.currentBuffs[i][1].Element == element) {
                    if (isDebuff) {
                        if (this.currentBuffs[i][1].Buff_Type == "Debuff")
                            return true;
                    }
                    else {
                        if (this.currentBuffs[i][1].Buff_Type == "Buff")
                            return true;
                    }
                }
            }
        }
        return false;
    }
    // give a copy to prevent unintended changes to the buff array when using it as a get function
    getBuffs() {
        let buffs = [];
        this.currentBuffs.forEach(buff => {
            let newBuff = [];
            buff.forEach(d => {
                newBuff.push(d);
            });
            buffs.push(newBuff);
        });
        return buffs;
    }
    // target defense buffs are added to attacker's defense ignore so we need to be able to get it
    getDefenseBuffs() {return this.defenseBuffs;}
    setDefenseBuffs(x) {
        this.resetDefenseBuffs();
        this.defenseBuffs += x;
        this.baseDefenseBuffs = 0;
    }
    resetDefenseBuffs() {
        this.defenseBuffs -= this.baseDefenseBuffs;
        this.baseDefenseBuffs = 0;
    }
    
    endTurn() {
        this.currentBuffs.forEach(buff => {
            if (buff[4] == "Turn") {
                // apply overburn damage over time effect, damage updates as the source's attack stat changes
                if (buff[0] == "Overburn" || buff[0] == "Corrosive Infusion" || buff[0] == "Corrosive Infusion V2") {
                    this.applyDoT(buff[0], buff[6]);
                }
                // if toxic infiltration is present, add 1 stack of corrosive infusion on ending turn
                if (buff[0] == "Toxic Infiltration") {
                    let doll = GameStateManager.getInstance().getDoll("Klukai");
                    if (doll.getFortification() > 1)
                        this.addBuff("Corrosive Infusion V2", "Klukai", 2, 1);
                    else
                        this.addBuff("Corrosive Infusion", "Klukai", 2, 1);
                }
                // if 2 stacks of frozen and ending turn, turn frozen into frigid
                if (buff[0] == "Frozen" && buff[3] == 2) {
                    this.removeBuff(buff[0]);
                    this.addBuff("Frigid", buff[6], 1, 1);
                }
                else {
                    // tick down all turn-based buffs by 1
                    buff[2]--;
                    if (buff[2] == 0) {
                        this.removeBuff(buff[0]);
                    }
                }
            }
        })
    }

    startTurn() {
        this.currentBuffs.forEach(buff => {
            if (buff[4] == "Round") {
                // tick down all round-based buffs by 1
                buff[2]--;
                if (buff[2] == 0) {
                    this.removeBuff(buff[0]);
                }
            }
        })
    }
    // enable/disable buffs, will not retroactively apply the buffs that were missed since this is meant to be set at the beginning and kept the same throughout
    enableBuffs() {this.buffsEnabled = 1;}
    disableBuffs() {this.buffsEnabled = 0;}

    finishCloning() {
        this.cloning = false;
    }
}

export default Unit;