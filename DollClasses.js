import Doll from "./Doll.js";
import { AmmoTypes, Elements, SkillNames } from "./Enums.js";
import GameStateManager from "./GameStateManager.js";
import TurnManager from "./TurnManager.js";

class Supporter extends Doll {
    constructor(name, defense, attack, crit_chance, crit_damage, fortification, supportLimit) {
        super(name, defense, attack, crit_chance, crit_damage, fortification);

        this.supportLimit = supportLimit;
        this.supportsUsed = 0;
        // not all supporters can use their support skills immediately, some can only do it with certain buffs
        this.supportEnabled = false;
    }

    useSupportSkill(target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = false) {
        if (this.supportsUsed < this.supportLimit && this.supportEnabled) {
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
        // most interceptor dolls need certain buffs to use it
        this.interceptEnabled = false;
    }

    useSupportSkill(target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = false) {
        if (this.interceptsUsed < this.interceptLimit && this.interceptEnabled) {
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
        this.supportEnabled = true;

        if (this.fortification > 2)
            this.supportDamageDealt += 0.1; // V3 10% support damage
    }

    getSkillDamage(skillName, target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = [false]) {
        // qj gets 1 index whenever she attacks
        if (skillName != SkillNames.ULT && this.CIndex < 6)
            this.CIndex++;
        // qj skill2 key condition is at least one phase exploit
        if (skillName == SkillNames.SKILL2 && this.keysEnabled[4]) {
            let weaknesses = target.getPhaseWeaknesses();
            let exploit = 0;
            for (let i = 0; i < weaknesses.length && !exploit; i++) {
                if (weaknesses[i] == Elements.BURN || weaknesses[i] == AmmoTypes.MEDIUM)
                    exploit = 1
            }
            if (exploit) {
                // v1 qj adds another conditional to the skill
                if (this.fortification == 0)
                    conditionalTriggered[0] = true;
                else
                    conditionalTriggered[1] = true;
            }
        }
        // v2+ qj skill3 has a conditional if the target is burning
        if (skillName == SkillNames.SKILL3) {
            if (target.hasBuff("Overburn"))
                conditionalTriggered[0] = true;
        }
        // qj ult has a conditional at max index
        if (skillName == SkillNames.ULT && this.CIndex == 6) {
            conditionalTriggered[0] = true;
            // rather than temporarily increasing max support by 1 and tracking that, I would rather just reduce the used counter by 1 even if it goes negative
            this.supportsUsed--;
        }
        // if the target is out of cover, qj deals extra damage, enhanced by v6
        if (GameStateManager.getInstance().getCover() == 0) {
            this.damageDealt += 0.1;
            if (this.fortification == 6)
                this.damageDealt += 0.1;
        }
        let damage = super.getSkillDamage(skillName, target, calculationType, conditionalTriggered);
        if (GameStateManager.getInstance().getCover() == 0) {
            this.damageDealt -= 0.1;
            if (this.fortification == 6)
                this.damageDealt -= 0.1;
        }

        return damage;
    }

    useSupportSkill(target, calculationType = CalculationTypes.SIMULATION, conditionalTriggered = false) {
        if (this.supportsUsed < this.supportLimit && this.supportEnabled) {
            this.supportsUsed++;
            let damage = this.getSkillDamage(SkillNames.SUPPORT, target, calculationType, conditionalTriggered);
            // V4 vuln application requires her to have support boost 2 stacks and the target to be out of cover
            if (this.hasBuff("Support Boost 2 V4") && GameStateManager.getInstance().getCover() == 0)
                target[0].addBuff("Vulnerability 1", 1, this);
            return damage;
        }
        return 0;
    }

    usePriorityDebuff(target, ally) {
        if (this.keysEnabled[2]) {
            target.addBuff("Defense Down 2", 1, this);
            console.log("Applying debuff");
        }
        if (this.fortification > 4) {
            ally.addBuff("Damage Up 2", 1, this);
        }
    }

    applyKey(index) {
        super.applyKey(index);
        if (index == 0)
            this.CIndex = 6;
    }

    cloneUnit() {
        return super.cloneUnit(new Qiongjiu(this.name, this.defense, this.attack, this.crit_chance, this.crit_damage, this.fortification));
    }
}

export class Makiatto extends Interceptor {
    constructor(name, defense, attack, crit_chance, crit_damage, fortification) {
        super(name, defense, attack, crit_chance, crit_damage, fortification, 2);

        this.interceptEnabled = true;
        if (this.fortification == 6)
            this.interceptLimit = 4;
        else if (this.fortification > 1)
            this.interceptLimit = 3;
    }
}