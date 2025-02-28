import Unit from "./Unit.js";

class Target extends Unit {
    constructor(name, defense, maxStability, turnsToRecoverStability, elementWeaknesses, ammoWeaknesses) {
        super(name, defense);
        // have stability automatically regen after the set amount of end turns with 0 stability
        this.maxStability = maxStability;
        this.stability = maxStability;
        this.turnsToRecoverStability = turnsToRecoverStability;
        this.stabilityBrokenTurns = 0;
        // phase weaknesses add a 0.1 to the weakness multiplier per weakness matched by the attack
        this.elementWeaknesses = elementWeaknesses;
        this.ammoWeaknesses = ammoWeaknesses;
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
    getElementWeaknesses() {return this.elementWeaknesses;}
    getAmmoWeaknesses() {return this.ammoWeaknesses;}
    // assemble total damage reduction with stability
    getDamageTaken() {return this.damageTaken + this.drPerStab * this.stability + this.stability>0 ? 0: this.drWithStab;}
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
    // stability is lower bounded to 0
    reduceStability(x) {Math.max(this.stability - x, 0);}

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
}

export default Target;