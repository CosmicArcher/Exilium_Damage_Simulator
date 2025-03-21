import ResourceLoader from "./ResourceLoader.js";
import DamageManager from "./DamageManager.js";
import EventManager from "./EventManager.js";
import { BuffJSONKeys, Elements } from "./Enums.js";
import GameStateManager from "./GameStateManager.js";
// root class for dolls (attackers) and targets (defenders)
class Unit {
    constructor(name, defense) { // some dolls use their defense stats for damage
        this.name = name;
        this.defense = defense;
        // stat buffs that are important for both target and attacker
        this.defenseBuffs = 0;
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
    getName() {return this.name;}
    // process buffs using json data
    applyBuffEffects(buffData, stacks = 1, stackable = false) {
        if(buffData.hasOwnProperty("DefensePerc")) {
            if (stackable)
                this.defenseBuffs += buffData["DefensePerc"] * stacks;
            else 
                this.defenseBuffs += buffData["DefensePerc"];
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
    // for applying overburn and corrosive pressure
    applyDoT(buffName, sourceName) {
        let attacker = GameStateManager.getInstance().getDoll(sourceName);
        if (buffName == "Overburn") {
            DamageManager.getInstance().applyFixedDamage(attacker.getAttack() * 0.1, sourceName);
        }
        else if (buffName == "Corrosive Pressure") {

        }
    }
    // these are called when buffs are added/removed
    addBuff(buffName, sourceName, duration = -1, stacks = 1) {
        let buffData = ResourceLoader.getInstance().getBuffData(buffName);
        if (buffData.hasOwnProperty(BuffJSONKeys.ELEMENT)) {
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
                if (!buffData[BuffJSONKeys.TURN_BASED])
                    duration = -1;
                if (!buffData.hasOwnProperty(BuffJSONKeys.STACK_LIMIT))
                    stacks = 1;
                // check if the unit already has the buff
                let index = -1;
                for (let i = 0; i < this.currentBuffs.length; i++) {
                    if (this.currentBuffs[i][0] == buffName)
                        index = i;
                }
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
                    if (buff[4]) {
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
    setDefenseBuffs(x) {this.defenseBuffs = x;} // only use for quick calcs, direct buff input
    
    endTurn() {
        this.currentBuffs.forEach(buff => {
            if (buff[4]) {
                // apply overburn damage over time effect, damage updates as the source's attack stat changes
                if (buff[0] == "Overburn" || buff[0] == "Corrosive Pressure") {
                    this.applyDoT(buff[0], buff[6]);
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
    // enable/disable buffs, will not retroactively apply the buffs that were missed since this is meant to be set at the beginning and kept the same throughout
    enableBuffs() {this.buffsEnabled = 1;}
    disableBuffs() {this.buffsEnabled = 0;}

    finishCloning() {
        this.cloning = false;
    }
}

export default Unit;