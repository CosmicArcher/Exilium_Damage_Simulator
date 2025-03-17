import { AttackTypes, SkillNames } from "./Enums.js";


let TurnManagerSingleton;

class TurnManager {
    constructor() {
        if (TurnManagerSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Turn Manager Instantiated");
            TurnManagerSingleton = this;
            TurnManagerSingleton.resetLists();
        }
    }

    static getInstance() {
        if (!TurnManagerSingleton)
            new TurnManager();
        return TurnManagerSingleton;
    }

    resetLists() {
        if (TurnManagerSingleton) {
            // targeted supporters are split into two groups, priority support that fire before the attacker, and regular support that fire after
            TurnManagerSingleton.prioritySupporters = [];
            TurnManagerSingleton.targetedSupporters = [];
            // for Qiongjiu priority def down 2 application if she has the relevant key and is present
            TurnManagerSingleton.priorityDebuffers = [];
            // action sequence goes priority debuff > priority attack > attacker > wise supports > regular support, doll slot number is the ingame tiebreaker
            TurnManagerSingleton.actionSequence = [];
            // supports that only activate under certain conditions, condtional is used as the key
            TurnManagerSingleton.conditionalSupporters = {};
            // flag to tell if the action sequence is already being processed top to bottom to ensure the function is only called once
            TurnManagerSingleton.actionsRunning = false;
        }
        else
            console.error("Singleton not yet initialized");
    }

    useDollSkill(doll, target, skillName, calculationType = calculationType.EXPECTED, conditionalOverride = false) {
        if (TurnManagerSingleton) {
            // targeted non-support skills are the most common type of triggers to get supported
            if (doll.getSkillAttackType(skillName) == AttackTypes.TARGETED && skillName != SkillNames.SUPPORT) {
                // regular support should be at the bottom of the sequence stack
                TurnManagerSingleton.targetedSupporters.forEach(d => {
                    if (d.getName() != doll.getName()) // a doll cannot support themself
                        TurnManagerSingleton.actionSequence.push([d, [target, doll], SkillNames.SUPPORT, calculationType, false]);
                });
                // add in the attacker that triggered it all
                TurnManagerSingleton.actionSequence.push([doll, target, skillName, calculationType, conditionalOverride]);
                // the priority supports added to the top of the stack
                TurnManagerSingleton.prioritySupporters.forEach(d => {
                    if (d.getName() != doll.getName()) // a doll cannot support themself
                        TurnManagerSingleton.actionSequence.push([d, [target, doll], SkillNames.SUPPORT, calculationType, false]);
                });
                // priority debuffs are  called immediately since only debuffs will be applied and nothing else
                TurnManagerSingleton.priorityDebuffers.forEach(d => {
                    if (d.getName() != doll.getName()) // a doll cannot support themself
                        d.usePriorityDebuff(target);
                });
                // if anything triggers a wise support, it will be added to the top of the stack
                // start the action sequence if it is not currently running
                if (!TurnManagerSingleton.actionsRunning)
                    TurnManagerSingleton.processActionSequence();
            }
        }
        else
            console.error("Singleton not yet initialized");
    }

    processActionSequence() {
        if (TurnManagerSingleton) {
            TurnManagerSingleton.actionsRunning = true;
            while (TurnManagerSingleton.actionSequence.length > 0) {
                let currentAction = TurnManagerSingleton.actionSequence.pop();
                // actions are an array consisting of [doll, target/[target, supported doll], skillName, calculationType, conditionalOverride]
                if (currentAction[1] != SkillNames.SUPPORT)
                    currentAction[0].getSkillDamage(currentAction[2], currentAction[1], currentAction[3], currentAction[4]);
                else
                    currentAction[0].useSupportSkill(currentAction[2], currentAction[3], currentAction[4]);

                console.log("Actions left: " + TurnManagerSingleton.actionSequence.length);
            }
            TurnManagerSingleton.actionsRunning = false;
        }
        else
            console.error("Singleton not yet initialized");
    }

    registerTargetedSupporter(doll, isPrioritySupport = false) {
        if (TurnManagerSingleton) {
            if (isPrioritySupport)
                TurnManagerSingleton.prioritySupporters.push(doll);
            else
                TurnManagerSingleton.targetedSupporters.push(doll);
        }
        else
            console.error("Singleton not yet initialized");
    }

    registerPriorityDebuffer(doll) {
        if (TurnManagerSingleton) {
            TurnManagerSingleton.priorityDebuffers.push(doll);
        }
        else
            console.error("Singleton not yet initialized");
    }

    registerConditionalSupporter(doll, condition) {
        if (TurnManagerSingleton) {
            // check if array for that key already exists
            if (TurnManagerSingleton.conditionalSupporters.hasOwnProperty(condition))
                TurnManagerSingleton.conditionalSupporters[condition].push(doll);
            // initialize array if the key does not exist yet
            else {
                TurnManagerSingleton.conditionalSupporters[condition] = [];
                TurnManagerSingleton.conditionalSupporters[condition].push(doll);
            }
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default TurnManager;