import { AttackTypes, SkillNames } from "./Enums.js";
import EventManager from "./EventManager.js";
import GameStateManager from "./GameStateManager.js";


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
            EventManager.getInstance().addListener("allyAction", TurnManagerSingleton.activateActionListeners);
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
            // for groza and suomi passives listening for other doll end turn
            TurnManagerSingleton.actionListener = [];
        }
        else
            console.error("Singleton not yet initialized");
    }

    useDollSkill(dollName, skillName, calculationType = calculationType.EXPECTED, conditionalOverride = false) {
        if (TurnManagerSingleton) {
            // targeted non-support skills are the most common type of triggers to get supported
            let doll = GameStateManager.getInstance().getDoll(dollName);
            let target = GameStateManager.getInstance().getTarget();
            if (doll.getSkillAttackType(skillName) == AttackTypes.TARGETED && skillName != SkillNames.SUPPORT) {
                // regular support should be at the bottom of the sequence stack
                TurnManagerSingleton.targetedSupporters.forEach(supportName => {
                    if (supportName != dollName) // a doll cannot support themself
                        TurnManagerSingleton.actionSequence.push([supportName, [target, doll], SkillNames.SUPPORT, calculationType, [false]]);
                });
                // add in the attacker that triggered it all
                TurnManagerSingleton.actionSequence.push([dollName, target, skillName, calculationType, conditionalOverride]);
                // the priority supports added to the top of the stack
                TurnManagerSingleton.prioritySupporters.forEach(supportName => {
                    if (supportName != dollName) // a doll cannot support themself
                        TurnManagerSingleton.actionSequence.push([supportName, [target, doll], SkillNames.SUPPORT, calculationType, [false]]);
                });
                // priority debuffs are  called immediately since only debuffs will be applied and nothing else
                TurnManagerSingleton.priorityDebuffers.forEach(supportName => {
                    if (supportName != dollName)  {// a doll cannot support themself
                        let support = GameStateManager.getInstance().getDoll(supportName);
                        support.usePriorityDebuff(target, doll);
                    }
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
                let doll = GameStateManager.getInstance().getDoll(currentAction[0]);
                // actions are an array consisting of [dollName, target/[target, supported doll], skillName, calculationType, conditionalOverride]
                if (currentAction[1] != SkillNames.SUPPORT) {
                    doll.getSkillDamage(currentAction[2], currentAction[1], currentAction[3], currentAction[4]);
                }
                else
                    doll.useSupportSkill(currentAction[2], currentAction[3], currentAction[4]);

                console.log("Actions left: " + TurnManagerSingleton.actionSequence.length);
            }
            TurnManagerSingleton.actionsRunning = false;  
            GameStateManager.getInstance().lockAction();
        }
        else
            console.error("Singleton not yet initialized");
    }

    registerTargetedSupporter(dollName, isPrioritySupport = false) {
        if (TurnManagerSingleton) {
            if (isPrioritySupport)
                TurnManagerSingleton.prioritySupporters.push(dollName);
            else
                TurnManagerSingleton.targetedSupporters.push(dollName);
        }
        else
            console.error("Singleton not yet initialized");
    }

    registerPriorityDebuffer(dollName) {
        if (TurnManagerSingleton) {
            TurnManagerSingleton.priorityDebuffers.push(dollName);
        }
        else
            console.error("Singleton not yet initialized");
    }

    registerConditionalSupporter(dollName, condition) {
        if (TurnManagerSingleton) {
            // check if array for that key already exists
            if (TurnManagerSingleton.conditionalSupporters.hasOwnProperty(condition))
                TurnManagerSingleton.conditionalSupporters[condition].push(dollName);
            // initialize array if the key does not exist yet
            else {
                TurnManagerSingleton.conditionalSupporters[condition] = [];
                TurnManagerSingleton.conditionalSupporters[condition].push(dollName);
            }
        }
        else
            console.error("Singleton not yet initialized");
    }

    registerActionListener(dollName) {
        if (TurnManagerSingleton) {
            TurnManagerSingleton.actionListener.push(dollName);
        }
        else
            console.error("Singleton not yet initialized");
    }

    activateActionListeners(triggeringDollName) {
        TurnManagerSingleton.actionListener.forEach(doll => {
            doll.alertAllyEnd(triggeringDollName);
        });
    }
}

export default TurnManager;