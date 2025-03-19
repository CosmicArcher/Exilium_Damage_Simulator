import { BuffJSONKeys, Elements } from "./Enums.js";
import EventManager from "./EventManager.js";
import Unit from "./Unit.js";

class Target extends Unit {
    constructor(name, defense, maxStability, turnsToRecoverStability, phaseWeaknesses) {
        super(name, defense);
        // have stability automatically regen after the set amount of end turns with 0 stability
        this.maxStability = maxStability;
        this.stability = maxStability;
        this.turnsToRecoverStability = turnsToRecoverStability;
        this.stabilityBrokenTurns = 0;
        // phase weaknesses add a 0.1 to the weakness multiplier per weakness matched by the attack
        this.phaseWeaknesses = phaseWeaknesses;
        // damage taken buffs/debuffs are only needed for targets
        this.damageTaken = 0;
        this.aoeDamageTaken = 0;
        this.targetedDamageTaken = 0;
        this.stabilityDamageModifier = 0;
        // base stats for modifying without using buffs
        this.baseDamageTaken = 0;
        this.baseAoEDamageTaken = 0;
        this.baseTargetedDamageTaken = 0;
        this.baseStabilityDamageModifier = 0;
        // some bosses have damage reduction based on stability
        this.drPerStab = 0;
        this.drWithStab = 0;
        // tag for some skills, bosses are typically large
        this.isLarge = true;
        // bosses are typically immune to command prohibition statuses
        this.buffImmunity = ["Frigid", "Stun", "Taunt", "Paralysis", "Overheated"];
        // Track whether a weakness was implanted by a tile or is inherent
        this.tempWeakness =[];
    }
    getStability() {return this.stability;} // for skills that check if stability is broken or not
    getPhaseWeaknesses() {return this.phaseWeaknesses;}
    // assemble total damage reduction with stability
    getDRPerStab() {return this.drPerStab;}
    getDRWithStab() {return this.drWithStab;}
    getDamageTaken() {return this.damageTaken;}
    getAoEDamageTaken() {return this.aoeDamageTaken;}
    getTargetedDamageTaken() {return this.targetedDamageTaken;}
    getStabilityDamageModifier() {return this.stabilityDamageModifier;}
    getIsLarge() {return this.isLarge;}
    // only use these setters for quick direct buff input calcs
    setDamageTaken(x) {
        this.resetDamageTaken();
        this.baseDamageTaken = x;
        this.damageTaken += x;
    }
    setAoEDamageTaken(x) {
        this.resetAoEDamageTaken();
        this.baseAoEDamageTaken = x;
        this.aoeDamageTaken += x;
    }
    setTargetedDamageTaken(x) {
        this.resetTargetedDamageTaken();
        this.baseTargetedDamageTaken = x;
        this.targetedDamageTaken += x;
    }
    setStabilityDamageModifier(x) {
        this.resetStabilityDamageModifier();
        this.baseStabilityDamageModifier = x;
        this.stabilityDamageModifier += x;
    }
    setIsLarge(x) {this.isLarge = x;}
    // changing the base buffs requires resetting the added value to 0 first
    resetDamageTaken() {
        this.damageTaken -= this.baseDamageTaken;
        this.baseDamageTaken = 0;
    }
    resetAoEDamageTaken() {
        this.aoeDamageTaken -= this.aoeDamageTaken;
        this.baseAoEDamageTaken = 0;
    }
    resetTargetedDamageTaken() {
        this.targetedDamageTaken -= this.baseTargetedDamageTaken;
        this.baseTargetedDamageTaken = 0;
    }
    resetStabilityDamageModifier() {
        this.stabilityDamageModifier -= this.baseStabilityDamageModifier;
        this.baseStabilityDamageModifier = 0;
    }
    // setters for use when cloning
    setStability(x) {this.stability = x;}
    setBrokenTurns(x) {this.stabilityBrokenTurns = x;}
    // process buffs using json data
    applyBuffEffects(buffData, stacks = 1, stackable = false) {
        super.applyBuffEffects(buffData, stacks, stackable);
        let stackEffect = 1;
        if (stackable)
            stackEffect = stacks;
        if(buffData.hasOwnProperty("DamageTaken%"))
            this.damageTaken += buffData["DamageTakenPerc"] * stackEffect;
        if(buffData.hasOwnProperty("AoEDamageTaken%"))
            this.aoeDamageTaken += buffData["AoEDamageTaken%"] * stackEffect;
        if(buffData.hasOwnProperty("TargetedDamageTaken%"))
            this.targetedDamageTaken += buffData["TargetedDamageTaken%"] * stackEffect;
        if(buffData.hasOwnProperty("StabilityDamageTaken"))
            this.stabilityDamageModifier += buffData["StabilityDamageTaken"] * stackEffect;
    }
    removeBuffEffects(buffData, stacks = 1, stackable = false) {
        super.removeBuffEffects(buffData, stacks, stackable);
        let stackEffect = 1;
        if (stackable)
            stackEffect = stacks;
        if(buffData.hasOwnProperty("DamageTaken%"))
            this.damageTaken -= buffData["DamageTakenPerc"] * stackEffect;
        if(buffData.hasOwnProperty("AoEDamageTaken%"))
            this.aoeDamageTaken -= buffData["AoEDamageTaken%"] * stackEffect;
        if(buffData.hasOwnProperty("TargetedDamageTaken%"))
            this.targetedDamageTaken -= buffData["TargetedDamageTaken%"] * stackEffect;
        if(buffData.hasOwnProperty("StabilityDamageTaken"))
            this.stabilityDamageModifier -= buffData["StabilityDamageTaken"] * stackEffect;
    }
    addBuff(buffName, sourceName, duration = -1, stacks = 1) {
        super.addBuff(buffName, sourceName, duration, stacks);
        // if avalanche reaches 5 stacks, reduce 8 stability and consume all stacks 
        if (buffName == "Avalanche") {
            for (let i = 0; i < this.currentBuffs.length; i++) {
                if (this.currentBuffs[i][0] == "Avalanche") {
                    if (this.currentBuffs[i][3] == 5) {
                        this.reduceStability(8);
                        EventManager.getInstance().broadcastEvent("avalanche", this.stability);
                        this.removeBuff("Avalanche");
                    }
                }
            }
        }
        // add temporary freeze weakness if on frost tile
        else if (buffName == "Frost") {
            if (!this.phaseWeaknesses.includes(Elements.FREEZE)) {
                this.phaseWeaknesses.push(Elements.FREEZE);
                this.tempWeakness.push(Elements.FREEZE);
            }
        }
    }
    removeBuff(buffName) {
        super.removeBuff(buffName);
        // once frost tile expires, remove freeze weakness if it was not inherent to the unit
        if (buffName == "Frost") {
            if (this.tempWeakness.includes(Elements.FREEZE)) {
                let removed = false;
                for (let i = 0; i < this.phaseWeaknesses.length && !removed; i++) {
                    if (this.phaseWeaknesses[i] == Elements.FREEZE) {
                        this.phaseWeaknesses.splice(i,1);
                        removed = true;
                    }
                }
                removed = false;
                for (let i = 0; i < this.tempWeakness.length && !removed; i++) {
                    if (this.tempWeakness[i] == Elements.FREEZE) {
                        this.tempWeakness.splice(i,1);
                        removed = true;
                    }
                }
            }
        }
    }
    // activate certain stability based damage reduction passives
    applyDRPerStab(x) {this.drPerStab = x;}
    applyDRWithStab(x) {this.drWithStab = x;}
    // check if any buffs get consumed by defending and reduce a stack
    takeDamage() {
        this.currentBuffs.forEach((buff) => {
            if (buff[5] == "Defense") { // check if buff stacks are consumed by defending
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
        });
    }
    // stability is lower bounded to 0, modifier is applied externally
    reduceStability(x) {if (this.stability > 0) this.stability = Math.max(this.stability - x, 0);}

    endTurn() {
        super.endTurn();
        // check if is on frost tile, add frozen stack on turn end before counting stability regen
        if (this.hasBuff("Frost")) {
            this.addBuff("Frozen", "Suomi", 1, 1);
        }
        // check if stability is broken
        if (this.stability == 0) {
            // count how many turns stability was broken, if number reaches the regeneration limit, recover full stability
            this.stabilityBrokenTurns++;
            if (this.stabilityBrokenTurns == this.turnsToRecoverStability) {
                this.stability = this.maxStability;
                this.stabilityBrokenTurns = 0;
            }
        }
    }
    // will figure out the best way to separate buff effects and their durations from direct set functions some other time
    cloneUnit() {
        // because phaseweaknesses can be changed at any time, copy the array rather than passing the reference
        let weaknesses = [];
        this.phaseWeaknesses.forEach(weakness => {
            weaknesses.push(weakness);
        });
        let temporaryWeaknesses = [];
        // because phaseweaknesses is modified by temporary weaknesses, ensure that the clone knows that those are temporary weaknesses rather than inherent 
        this.tempWeakness.forEach(weakness => {
            temporaryWeaknesses.push(weakness);
        });
        let targetClone = new Target(this.name, this.defense, this.maxStability, this.turnsToRecoverStability, weaknesses);
        targetClone.tempWeakness = temporaryWeaknesses;
        targetClone.setDamageTaken(this.baseDamageTaken);
        targetClone.setAoEDamageTaken(this.baseAoEDamageTaken);
        targetClone.setTargetedDamageTaken(this.baseTargetedDamageTaken);
        targetClone.setStabilityDamageModifier(this.baseStabilityDamageModifier);
        targetClone.applyDRPerStab(this.drPerStab);
        targetClone.applyDRWithStab(this.drWithStab);
        targetClone.setDefenseBuffs(this.defenseBuffs);
        targetClone.setBrokenTurns(this.stabilityBrokenTurns);
        targetClone.setStability(this.stability);
        targetClone.setIsLarge(this.isLarge);
        // buffs are enabled by default so check if they are disabled when cloning
        if (!this.buffsEnabled)
            targetClone.disableBuffs();
        else {
            this.currentBuffs.forEach(buff => {
                targetClone.addBuff(buff[0], buff[2], buff[3], buff[6]);
            });
            this.buffImmunity.forEach(immunity => {
                targetClone.buffImmunity.push(immunity);
            });
        }
        targetClone.finishCloning();
        return targetClone;
    }
}

export default Target;