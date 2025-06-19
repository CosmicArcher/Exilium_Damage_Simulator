import { BuffJSONKeys, Elements, StatVariants } from "./Enums.js";
import EventManager from "./EventManager.js";
import GameStateManager from "./GameStateManager.js";
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
        let variants = Object.values(StatVariants);
        this.damageTaken = {};
        //this.aoeDamageTaken = 0;
        //this.targetedDamageTaken = 0;
        this.stabilityTakenModifier = {};
        this.baseDamageTaken = {};
        this.baseStabilityTakenModifier = {};
        variants.forEach(variant => {
            this.damageTaken[variant] = 0;
            this.stabilityTakenModifier[variant] = 0;
            this.baseDamageTaken[variant] = 0;
            this.baseStabilityTakenModifier[variant] = 0;
        });
        // base stats for modifying without using buffs
        //this.baseAoEDamageTaken = 0;
        //this.baseTargetedDamageTaken = 0;
        // some bosses have damage reduction based on stability
        this.drPerStab = 0;
        this.drWithStab = 0;
        // tag for some skills, bosses are typically large
        this.isLarge = true;
        this.isBoss = true;
        // bosses are typically immune to command prohibition statuses
        this.buffImmunity = ["Frigid", "Stun", "Taunt", "Paralysis", "Overheated"];
        // Track whether a weakness was implanted by a tile or is inherent
        this.tempWeakness =[];
    }
    getStability() {return this.stability;} // for skills that check if stability is broken or not
    getPhaseWeaknesses() {return this.phaseWeaknesses;}
    // for display purposes
    getMaxStability() {return this.maxStability;} 
    getBrokenTurns() {return this.stabilityBrokenTurns;}
    getTurnsToRecover() {return this.turnsToRecoverStability;}
    // assemble total damage reduction with stability
    getDRPerStab() {return this.drPerStab;}
    getDRWithStab() {return this.drWithStab;}
    getDamageTaken(variant = StatVariants.ALL) {
        return this.damageTaken.hasOwnProperty(variant) ? this.damageTaken[variant] : 0;
    }
    //getAoEDamageTaken() {return this.aoeDamageTaken;}
    //getTargetedDamageTaken() {return this.targetedDamageTaken;}
    getStabilityTakenModifier(variant = StatVariants.ALL) {
        return this.stabilityTakenModifier.hasOwnProperty(variant) ? this.stabilityTakenModifier[variant] : 0;
    }
    // base stats for cloning
    getBaseDamageTaken(variant = StatVariants.ALL) {
        return this.baseDamageTaken.hasOwnProperty(variant) ? this.baseDamageTaken[variant] : 0;
    }
    //getBaseAoEDamageTaken() {return this.baseAoEDamageTaken;}
    //getBaseTargetedDamageTaken() {return this.baseTargetedDamageTaken;}
    getBaseStabilityTakenModifier(variant = StatVariants.ALL) {
        return this.baseStabilityTakenModifier.hasOwnProperty(variant) ? this.baseStabilityTakenModifier[variant] : 0;
    }
    getIsLarge() {return this.isLarge;}
    getIsBoss() {return this.isBoss;}
    // only use these setters for quick direct buff input calcs
    setDamageTaken(x, variant = StatVariants.ALL) {
        this.resetDamageTaken(variant);
        this.baseDamageTaken[variant] = x;
        this.damageTaken[variant] += x;
    }
    /*setAoEDamageTaken(x) {
        this.resetAoEDamageTaken();
        this.baseAoEDamageTaken = x;
        this.aoeDamageTaken += x;
    }
    setTargetedDamageTaken(x) {
        this.resetTargetedDamageTaken();
        this.baseTargetedDamageTaken = x;
        this.targetedDamageTaken += x;
    }*/
    setStabilityTakenModifier(x, variant = StatVariants.ALL) {
        this.resetStabilityTakenModifier(variant);
        this.baseStabilityTakenModifier[variant] = x;
        this.stabilityTakenModifier[variant] += x;
    }
    setIsLarge(x) {this.isLarge = x;}
    setIsBoss(x) {this.isBoss = x;}
    // changing the base buffs requires resetting the added value to 0 first
    resetDamageTaken(variant = StatVariants.ALL) {
        this.damageTaken[variant] -= this.baseDamageTaken[variant];
        this.baseDamageTaken[variant] = 0;
    }
    /*resetAoEDamageTaken(variant = StatVariants.ALL) {
        this.aoeDamageTaken -= this.aoeDamageTaken;
        this.baseAoEDamageTaken = 0;
    }
    resetTargetedDamageTaken() {
        this.targetedDamageTaken -= this.baseTargetedDamageTaken;
        this.baseTargetedDamageTaken = 0;
    }*/
    resetStabilityTakenModifier(variant = StatVariants.ALL) {
        this.stabilityTakenModifier[variant] -= this.baseStabilityTakenModifier[variant];
        this.baseStabilityTakenModifier[variant] = 0;
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
        if(buffData.hasOwnProperty(BuffJSONKeys.DAMAGE_TAKEN)) {
            let buff = buffData[BuffJSONKeys.DAMAGE_TAKEN];
            if (this.damageTaken.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.damageTaken[buff[0]] += buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
            //this.damageTaken[StatVariants.ALL] += buffData[BuffJSONKeys.DAMAGE_TAKEN] * stackEffect;
        //if(buffData.hasOwnProperty(BuffJSONKeys.AOE_DAMAGE_TAKEN))
        //    this.damageTaken[StatVariants.AOE] += buffData[BuffJSONKeys.AOE_DAMAGE_TAKEN] * stackEffect;
        //if(buffData.hasOwnProperty(BuffJSONKeys.TARGETED_DAMAGE_TAKEN))
        //    this.damageTaken[StatVariants.TARGETED] += buffData[BuffJSONKeys.TARGETED_DAMAGE_TAKEN] * stackEffect;
        if(buffData.hasOwnProperty(BuffJSONKeys.STABILITY_TAKEN)) {
            let buff = buffData[BuffJSONKeys.STABILITY_TAKEN];
            if (this.stabilityTakenModifier.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.stabilityTakenModifier[buff[0]] += buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
            //this.stabilityTakenModifier[StatVariants.ALL] += buffData[BuffJSONKeys.STABILITY_TAKEN] * stackEffect;
    }
    removeBuffEffects(buffData, stacks = 1, stackable = false) {
        super.removeBuffEffects(buffData, stacks, stackable);
        let stackEffect = 1;
        if (stackable)
            stackEffect = stacks;
        if(buffData.hasOwnProperty(BuffJSONKeys.DAMAGE_TAKEN)) {
            let buff = buffData[BuffJSONKeys.DAMAGE_TAKEN];
            if (this.damageTaken.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.damageTaken[buff[0]] -= buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
        if(buffData.hasOwnProperty(BuffJSONKeys.STABILITY_TAKEN)) {
            let buff = buffData[BuffJSONKeys.STABILITY_TAKEN];
            if (this.stabilityTakenModifier.hasOwnProperty(buff[0])) // safety check in case of typo/forgotten edit in json
                this.stabilityTakenModifier[buff[0]] -= buff[1] * stackEffect;
            else
                console.error(`${buff[0]} is not covered in StatVariants`);
        }
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
    takeDamage(element, attackerName) {
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
            // flammable does not have defense tag but will be reduced when hit by burn damage
            else if (buff[0] == "Flammable" && element == Elements.BURN) {
                buff[3]--;
                if (buff[3] == 0) {
                    this.removeBuff(buff[0]);
                }
                EventManager.getInstance().broadcastEvent("stackConsumption", [this.name, 1, buff[0]]);
            }
            // if the target has corrosive infusion and takes corrosion damage from not Klukai, add another stack
            else if (buff[0].match("Corrosive Infusion") && element == Elements.CORROSION && attackerName != "Klukai") {
                let doll = GameStateManager.getInstance().getDoll(buff[6]);
                if (doll.fortification < 2)
                    this.addBuff("Corrosive Infusion", "Klukai", 2, 1);
                else // v2+ klukai applies 2 stacks for allied corrosion damage or her own attacks on a target with corrosive infusion
                    this.addBuff("Corrosive Infusion V2", "Klukai", 2, 2);
            }
        });
        // if Klukai is present and corrosive damage is taken from not Klukai, give her 1 index, also grant 1 passive stack if v2+
        if (element == Elements.CORROSION && GameStateManager.getInstance().hasDoll("Klukai") && attackerName != "Klukai") {
            let doll = GameStateManager.getInstance().getDoll("Klukai");
            doll.adjustIndex(1);
            // check if v2+ to apply 1 competitive spirit stack
            if (doll.getFortification() > 1) {
                doll.addBuff("Competitive Spirit V2", "Klukai", -1, 1);
            }
        }
    }
    // called to decrease the counter of buffs that only tick down from the primary attacker and not supports
    takePrimaryDamage() {
        this.currentBuffs.forEach((buff) => {
            if (buff[0] == "Edifice") { // edifice is the only buff that works that way at the moment
                buff[3]--;
                if (buff[3] == 0) {
                    this.removeBuff(buff[0]);
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
                EventManager.getInstance().broadcastEvent("stabilityRegen", [this.name, this.stability]);
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
        let variants = Object.values(StatVariants);
        variants.forEach(variant => {
            targetClone.setDamageTaken(this.baseDamageTaken[variant], variant);
            targetClone.setStabilityTakenModifier(this.baseStabilityTakenModifier[variant], variant);
        });
        //targetClone.setAoEDamageTaken(this.baseAoEDamageTaken);
        //targetClone.setTargetedDamageTaken(this.baseTargetedDamageTaken);
        targetClone.applyDRPerStab(this.drPerStab);
        targetClone.applyDRWithStab(this.drWithStab);
        targetClone.setDefenseBuffs(this.baseDefenseBuffs);
        targetClone.setBrokenTurns(this.stabilityBrokenTurns);
        targetClone.setStability(this.stability);
        targetClone.setIsLarge(this.isLarge);
        targetClone.setIsBoss(this.isBoss);
        // buffs are enabled by default so check if they are disabled when cloning
        if (!this.buffsEnabled)
            targetClone.disableBuffs();
        else {
            this.currentBuffs.forEach(buff => {
                targetClone.addBuff(buff[0], buff[6], buff[2], buff[3]);
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