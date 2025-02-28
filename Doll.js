import Unit from "./Unit.js";
import ResourceLoader from "./ResourceLoader.js";

class Doll extends Unit {
    constructor(name, defense, attack, crit_chance, crit_damage, set_bonus) {
        super(name, defense);
        this.attack = attack;
        this.crit_chance = crit_chance;
        this.crit_damage = crit_damage;
        this.set_bonus = set_bonus;
        this.CIndex = 3;
    }

    initializeSkillData() {
        this.skillData = ResourceLoader.getInstance().getSkillData(this.name);
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
    }
}

export default Doll;