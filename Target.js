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
        // some bosses have damage reduction based on stability
        this.drPerStab = 0;
        this.drWithStab = 0;
    }
    getStability() {return this.stability;} // for skills that check if stability is broken or not
    getPhaseWeaknesses() {return this.phaseWeaknesses;}
    // assemble total damage reduction with stability
    getDamageTaken() {return this.damageTaken - this.drPerStab * this.stability - (this.stability>0 ? this.drWithStab : 0);}
    getAoEDamageTaken() {return this.aoeDamageTaken;}
    getTargetedDamageTaken() {return this.targetedDamageTaken;}
    getStabilityDamageModifier() {return this.stabilityDamageModifier;}
    // only use these setters for quick direct buff input calcs
    setDamageTaken(x) {this.damageTaken = x;}
    setAoEDamageTaken(x) {this.aoeDamageTaken = x;}
    setTargetedDamageTaken(x) {this.targetedDamageTaken = x;}
    setStabilityDamageModifier(x) {this.stabilityDamageModifier = x;}
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
    reduceStability(x) {this.stability = Math.max(this.stability - x, 0);}

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
        targetClone.setDamageTaken(this.damageTaken);
        targetClone.setAoEDamageTaken(this.aoeDamageTaken);
        targetClone.setTargetedDamageTaken(this.targetedDamageTaken);
        targetClone.setStabilityDamageModifier(this.stabilityDamageModifier);
        targetClone.applyDRPerStab(this.drPerStab);
        targetClone.applyDRWithStab(this.drWithStab);
        targetClone.setDefenseBuffs(this.defenseBuffs);
        this.currentBuffs.forEach(d => {
            targetClone.addBuff(d[0], d[2], d[5]);
        });

        return targetClone;
    }
}

export default Target;