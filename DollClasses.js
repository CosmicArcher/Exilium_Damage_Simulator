import Doll from "./Doll.js";
import { SkillNames } from "./Enums.js";
import TurnManager from "./TurnManager.js";

class Supporter extends Doll {
    constructor(name, defense, attack, crit_chance, crit_damage, fortification, supportLimit) {
        super(name, defense, attack, crit_chance, crit_damage, fortification);

        this.supportLimit = supportLimit;
        this.supportsUsed = 0;
    }

    useSupportSkill(target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = false) {
        if (this.supportsUsed < this.supportLimit) {
            this.supportsUsed++;
            return this.getSkillDamage(SkillNames.SUPPORT, target, calculationType, conditionalTriggered);
        }
        return 0;
    }

    refreshSupportUses() {
        this.supportsUsed = 0;
    }
}

class Interceptor extends Doll {
    constructor(name, defense, attack, crit_chance, crit_damage, fortification, interceptLimit) {
        super(name, defense, attack, crit_chance, crit_damage, fortification);

        this.interceptLimit = interceptLimit;
        this.interceptsUsed = 0;
    }

    useSupportSkill(target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = false) {
        if (this.interceptsUsed < this.interceptLimit) {
            this.interceptsUsed++;
            return this.getSkillDamage(SkillNames.INTERCEPT, target, calculationType, conditionalTriggered);
        }
        return 0;
    }

    refreshSupportUses() {
        this.interceptsUsed = 0;
    }
}

export class Qiongjiu extends Supporter {
    constructor(name, defense, attack, crit_chance, crit_damage, fortification) {
        super(name, defense, attack, crit_chance, crit_damage, fortification, 3);

        TurnManager.getInstance().registerTargetedSupporter(this, false);
        TurnManager.getInstance().registerPriorityDebuffer(this);
    }

    usePriorityDebuff(target) {
        target.addBuff("Defense Down 2", 1, this);
        console.log("Applying debuff");
    }
}

export class Makiatto extends Interceptor {
    constructor(name, defense, attack, crit_chance, crit_damage, fortification) {
        super(name, defense, attack, crit_chance, crit_damage, fortification, 2);
    }
}