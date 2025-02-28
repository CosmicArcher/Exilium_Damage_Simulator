import Unit from "./Unit.js";

class Target extends Unit {
    constructor(name, defense, maxStability, turnsToRecoverStability) {
        super(name, defense);
        // have stability automatically regen after the set amount of end turns with 0 stability
        this.maxStability = maxStability;
        this.stability = maxStability;
        this.turnsToRecoverStability = turnsToRecoverStability;
        this.stabilityBrokenTurns = 0;
    }
    // process buffs using json data
    applyBuffEffects(buffData) {
        super(buffData);
    }
    removeBuffEffects(buffData) {
        super(buffData);
    }

    endTurn() {
        super();
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