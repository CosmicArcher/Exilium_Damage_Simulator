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
    applyBuffEffects(buffData) {
        super.applyBuffEffects(buffData);
        if(buffData.hasOwnProperty("DamageTaken%"))
            this.damageTaken += buffData["DamageTaken%"];
        if(buffData.hasOwnProperty("AoEDamageTaken%"))
            this.aoeDamageTaken += buffData["AoEDamageTaken%"];
        if(buffData.hasOwnProperty("TargetedDamageTaken%"))
            this.targetedDamageTaken += buffData["TargetedDamageTaken%"];
        if(buffData.hasOwnProperty("StabilityDamageTaken"))
            this.stabilityDamageModifier += buffData["StabilityDamageTaken"];
    }
    removeBuffEffects(buffData) {
        super.removeBuffEffects(buffData);
        if(buffData.hasOwnProperty("DamageTaken%"))
            this.damageTaken -= buffData["DamageTaken%"];
        if(buffData.hasOwnProperty("AoEDamageTaken%"))
            this.aoeDamageTaken -= buffData["AoEDamageTaken%"];
        if(buffData.hasOwnProperty("TargetedDamageTaken%"))
            this.targetedDamageTaken -= buffData["TargetedDamageTaken%"];
        if(buffData.hasOwnProperty("StabilityDamageTaken"))
            this.stabilityDamageModifier -= buffData["StabilityDamageTaken"];
    }
    addBuff(buffName, duration, source) {
        super.addBuff(buffName, duration, source);
        // if avalanche reaches 5 stacks, reduce 8 stability and consume all stacks 
        if (buffName == "Avalanche") {
            this.reduceStability(8);
            EventManager.getInstance().broadcastEvent("avalanche", this.stability);
        }
    }
    // activate certain stability based damage reduction passives
    applyDRPerStab(x) {this.drPerStab = x;}
    applyDRWithStab(x) {this.drWithStab = x;}
    // check if any buffs get consumed by defending and reduce a stack
    takeDamage() {
        this.currentBuffs.forEach((d, i) => {
            if (!d[3] && d[4]) { // check if buff is not turn based and stacks are consumed by defending
                d[2]--;
                if (d[2] == 0) {
                    this.removeBuff(d[0]);
                }
            }
        });
    }
    // stability is lower bounded to 0, modifier is applied externally
    reduceStability(x) {if (this.stability > 0) this.stability = Math.max(this.stability - x, 0);}

    endTurn() {
        super.endTurn();
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
        let targetClone = new Target(this.name, this.defense, this.maxStability, this.turnsToRecoverStability, this.phaseWeaknesses);
        targetClone.setDamageTaken(this.baseDamageTaken);
        targetClone.setAoEDamageTaken(this.baseAoEDamageTaken);
        targetClone.setTargetedDamageTaken(this.baseTargetedDamageTaken);
        targetClone.setStabilityDamageModifier(this.baseStabilityDamageModifier);
        targetClone.applyDRPerStab(this.drPerStab);
        targetClone.applyDRWithStab(this.drWithStab);
        targetClone.setDefenseBuffs(this.defenseBuffs);
        targetClone.setBrokenTurns(this.stabilityBrokenTurns);
        targetClone.setStability(this.stability);
        // buffs are enabled by default so check if they are disabled when cloning
        if (!this.buffsEnabled)
            targetClone.disableBuffs();
        else
            this.currentBuffs.forEach(d => {
                targetClone.addBuff(d[0], d[2], d[5]);
            });
        
        targetClone.finishCloning();
        return targetClone;
    }
}

export default Target;