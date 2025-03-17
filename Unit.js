import ResourceLoader from "./ResourceLoader.js";
import DamageManager from "./DamageManager.js";
import EventManager from "./EventManager.js";
// root class for dolls (attackers) and targets (defenders)
class Unit {
    constructor(name, defense) { // some dolls use their defense stats for damage
        this.name = name;
        this.defense = defense;
        // stat buffs that are important for both target and attacker
        this.defenseBuffs = 0;
        // track buff name, buff data, turns/stacks left, isTurnBased, isDefenseConsumed, source (for overburn damage)
        this.currentBuffs = [];
        // some modes of the calculator will be purely manual input of buff effects while others will be automatic from the addBuff() function
        this.buffsEnabled = 1;
        // flag to disable event broadcasting of buff applications while copying buffs from original to clone
        this.cloning = true;
    }

    setDefense(x) {this.defense = x;}
    getDefense() {return this.defense;}
    getName() {return this.name;}
    // process buffs using json data
    applyBuffEffects(buffData) {
        if(buffData.hasOwnProperty("DefensePerc"))
            this.defenseBuffs += buffData["DefensePerc"];
    }
    removeBuffEffects(buffData) {
        if(buffData.hasOwnProperty("DefensePerc"))
            this.defenseBuffs -= buffData["DefensePerc"];
    }
    // these are called when buffs are added/removed
    addBuff(buffName, duration, source) {
        let buffData = ResourceLoader.getInstance().getBuffData(buffName);
        if (buffData && this.buffsEnabled) {
            if (!this.cloning)
                EventManager.getInstance().broadcastEvent("statusApplied", [source, this, buffName]);
            this.currentBuffs.push([buffName, buffData, duration, buffData["Turn_Based"], buffData["Defense_Consumed"], source]);
            if (buffName == "Overburn") {
                DamageManager.getInstance().applyFixedDamage(source.getAttack() * 0.1);
            }
            this.applyBuffEffects(buffData);
        }
    }
    removeBuff(buffName) {
        // sanity check by checking if the buff exists in the array first
        this.currentBuffs.forEach((buff,i) => {
            if (buff[0] == buffName) {
                this.removeBuffEffects(buff[1]);
                this.currentBuffs.splice(i, 1);
                return; // exit loop early once buff has been found
            }
        });
    }

    hasBuff(buffName) {
        for (let i = 0; i < this.currentBuffs.length; i++) {
            if (buff[0] == buffName)
                return true;
        }
        return false;
    }

    getBuffs() {
        return this.currentBuffs;
    }
    // target defense buffs are added to attacker's defense ignore so we need to be able to get it
    getDefenseBuffs() {return this.defenseBuffs;}
    setDefenseBuffs(x) {this.defenseBuffs = x;} // only use for quick calcs, direct buff input
    
    endTurn() {
        this.currentBuffs.forEach(d => {
            if (d[3]) {
                // apply overburn damage over time effect, damage updates as the source's attack stat changes
                if (d[0] == "Overburn") {
                    DamageManager.getInstance().applyFixedDamage(d[5].getAttack() * 0.1);
                }
                // tick down all turn-based buffs by 1
                d[2]--;
                if (d[2] == 0) {
                    this.removeBuff(d[0]);
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