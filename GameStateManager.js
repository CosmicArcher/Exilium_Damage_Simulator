import { CalculationTypes } from "./Enums.js";
import StatTracker from "./StatTracker.js";
import ChartMaker from "./ChartMaker.js";
import GlobalBuffManager from "./GlobalBuffManager.js";

let GameStateManagerSingleton;

class GameStateManager {
    constructor() {
        if (GameStateManagerSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Game State Manager Instantiated");
            GameStateManagerSingleton = this;
            // track actions made and end turn on every unit
            GameStateManagerSingleton.resetSimulation();
        }
    }

    static getInstance() {
        if (!GameStateManagerSingleton)
            new GameStateManager();
        return GameStateManagerSingleton;
    }
    // return to a clean slate to test a completely different setup
    resetSimulation() {
        if (GameStateManagerSingleton) {
            GameStateManagerSingleton.target = [null];
            GameStateManagerSingleton.coverValue = 0;
            GameStateManagerSingleton.dolls = [[]];
            // to set different calculation types for each doll, some expected damage, others always crit, some rng, etc.
            GameStateManagerSingleton.calcTypes = [];
            // rewinding will be implemented as each action creating a clone of all units and modifying them when using skills and applying buffs
            // rewinding to a specific action will delete all indices after that action
            GameStateManagerSingleton.actionCount = 0;
            // track which "round" the simulation is currently in
            GameStateManagerSingleton.actionRound = [1];
            // track whether the player is acting on this action count
            GameStateManagerSingleton.playerTurn = [1];
        }
        else
            console.error("Singleton not yet initialized");
    }
    startSimulation() {
        if (GameStateManagerSingleton) {
            // activate all the turn start effects and apply global weapon buffs
            let globalWeaponPairs = GlobalBuffManager.getInstance().getGlobalWeaponBuffs();
            GameStateManagerSingleton.dolls[0].forEach(doll => {
                doll.startTurn();
                globalWeaponPairs.forEach(weaponDoll => {
                    doll.addBuff(weaponDoll[0], weaponDoll[1], -1, 1);
                });
            });
            // clone the first version of the units
            let target = GameStateManagerSingleton.target[0];
            let dolls = GameStateManagerSingleton.dolls[0];
            let newTarget = target.cloneUnit();
            let newDolls = [];
            dolls.forEach(doll => {
                newDolls.push(doll.cloneUnit());
            });
            // put the latest units as the ones in the get functions
            GameStateManagerSingleton.target.push(newTarget);
            GameStateManagerSingleton.dolls.push(newDolls);
            GameStateManagerSingleton.actionRound.push(1);
            GameStateManagerSingleton.playerTurn.push(1);

            StatTracker.getInstance().startSimulation();
            ChartMaker.getInstance().createDPSChart();
        }
        else
            console.error("Singleton not yet initialized");
    }
    getActionCount() {
        if (GameStateManagerSingleton) {
            return GameStateManagerSingleton.actionCount;
        }
        else
            console.error("Singleton not yet initialized");
    }
    getRoundNumber() {
        if (GameStateManagerSingleton) {
            return GameStateManagerSingleton.actionRound[GameStateManagerSingleton.actionCount + 1];
        }
        else
            console.error("Singleton not yet initialized");
    }
    getRounds() {
        if (GameStateManagerSingleton) {
            return GameStateManagerSingleton.actionRound;
        }
        else
            console.error("Singleton not yet initialized");
    }
    getPlayerActing() {
        if (GameStateManagerSingleton) {
            return GameStateManagerSingleton.playerTurn[GameStateManagerSingleton.actionCount + 1];
        }
        else
            console.error("Singleton not yet initialized");
    }
    // game state manager holds reference to the target
    registerTarget(target) {
        if (GameStateManagerSingleton) {
            GameStateManagerSingleton.target[0] = target;
        }
        else
            console.error("Singleton not yet initialized");
    }
    getTarget() {
        if (GameStateManagerSingleton) {
            return GameStateManagerSingleton.target[GameStateManagerSingleton.actionCount+1];
        }
        else
            console.error("Singleton not yet initialized");
    }
    // for dolls like makiatto that apply a debuff on the target at the start of combat at 0 actions
    getBaseTarget() {
        if (GameStateManagerSingleton) {
            return GameStateManagerSingleton.target[0];
        }
        else
            console.error("Singleton not yet initialized");
    }
    // game state manager holds references to the dolls for searching by name and cloning as rewind will require multiple copies of the same doll
    registerDoll(doll) {
        if (GameStateManagerSingleton) {
            GameStateManagerSingleton.dolls[0].push(doll);
            // default to expected type
            GameStateManagerSingleton.calcTypes.push(CalculationTypes.EXPECTED);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // return the latest copy of the doll
    getDoll(dollName) {
        if (GameStateManagerSingleton) {
            for (let i = 0; i < GameStateManagerSingleton.dolls[GameStateManagerSingleton.actionCount+1].length; i++) {
                if (GameStateManagerSingleton.dolls[GameStateManagerSingleton.actionCount+1][i].getName() == dollName)
                    return GameStateManagerSingleton.dolls[GameStateManagerSingleton.actionCount+1][i];
            }
            console.error(`${dollName} does not exist in Game State Manager singleton`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // for passives that want to give buffs to other dolls on action 0
    getBaseDoll(dollName) {
        if (GameStateManagerSingleton) {
            for (let i = 0; i < GameStateManagerSingleton.dolls[0].length; i++) {
                if (GameStateManagerSingleton.dolls[0][i].getName() == dollName)
                    return GameStateManagerSingleton.dolls[0][i];
            }
            console.error(`${dollName} does not exist in Game State Manager singleton`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // return whether the doll exists in the team
    hasDoll(dollName) {
        if (GameStateManagerSingleton) {
            for (let i = 0; i < GameStateManagerSingleton.dolls[GameStateManagerSingleton.actionCount+1].length; i++) {
                if (GameStateManagerSingleton.dolls[GameStateManagerSingleton.actionCount+1][i].getName() == dollName)
                    return true;
            }
            return false;
        }
        else
            console.error("Singleton not yet initialized");
    }
    // return the latest copies of all the dolls
    getAllDolls() {
        if (GameStateManagerSingleton) 
            return GameStateManagerSingleton.dolls[GameStateManagerSingleton.actionCount+1];
        else
            console.error("Singleton not yet initialized");
    }
    // cover is assumed to always be facing the attacker and indestructible
    addCover(coverValue) {
        if (GameStateManagerSingleton) {
            GameStateManagerSingleton.coverValue = coverValue;
        }
        else
            console.error("Singleton not yet initialized");
    }
    getCover() {
        if (GameStateManagerSingleton)
            return GameStateManagerSingleton.coverValue;
        else
            console.error("Singleton not yet initialized");
    }
    // let the target perform their turn, ticking down any buffs/debuffs and refreshing support charges and lock the final state in as another action
    endRound() {
        if (GameStateManagerSingleton) {
            GameStateManagerSingleton.target[GameStateManagerSingleton.actionCount+1].endTurn();
            GameStateManagerSingleton.dolls[GameStateManagerSingleton.actionCount+1].forEach(doll => {
                // if the doll still has turn available, consider their turn skipped and end turn to tick down buffs
                if (doll.hasTurnAvailable())
                    doll.endTurn();
                doll.startTurn();
            });
            GameStateManagerSingleton.actionRound[GameStateManagerSingleton.actionCount+1]++;
            GameStateManagerSingleton.lockAction();
        }
        else
            console.error("Singleton not yet initialized");
    }
    // "lock in" the effects of the last action and clone all units in preparation for the next action
    lockAction() {
        if (GameStateManagerSingleton) {
            let target = GameStateManagerSingleton.target[GameStateManagerSingleton.actionCount+1];
            // check if the latest action ended the player's turn and start the enemy's turn and count down round buffs if applicable
            let playerActing = 0;
            if (!this.isPlayerActing()) {
                // if player turn is over but was still available in the previous action, call target's startTurn() function
                if (GameStateManagerSingleton.playerTurn[GameStateManagerSingleton.actionCount+1])
                    target.startTurn();
            }
            else
                playerActing = 1;
            GameStateManagerSingleton.playerTurn[GameStateManagerSingleton.actionCount+1] = playerActing;
            // clone the latest version of the units
            let dolls = GameStateManagerSingleton.dolls[GameStateManagerSingleton.actionCount+1];
            let newTarget = target.cloneUnit();
            let newDolls = [];
            dolls.forEach(doll => {
                newDolls.push(doll.cloneUnit());
            });
            // put the latest units as the ones in the get functions
            GameStateManagerSingleton.target.push(newTarget);
            GameStateManagerSingleton.dolls.push(newDolls);
            GameStateManagerSingleton.actionRound.push(GameStateManagerSingleton.actionRound[GameStateManagerSingleton.actionCount+1]);
            GameStateManagerSingleton.playerTurn.push(playerActing);
            GameStateManagerSingleton.actionCount++;

            StatTracker.getInstance().lockAction();
            ChartMaker.getInstance().createDPSChart();
        }
        else
            console.error("Singleton not yet initialized");
    }
    
    rewindToAction(actionNumber) {
        if (GameStateManagerSingleton) {
            GameStateManagerSingleton.actionCount = actionNumber;
            // clone the version of the units from actionNumber and put the clones at the new end of the array
            let target = GameStateManagerSingleton.target[actionNumber];
            let dolls = GameStateManagerSingleton.dolls[actionNumber];
            let newTarget = target.cloneUnit();
            let newDolls = [];
            dolls.forEach(doll => {
                newDolls.push(doll.cloneUnit());
            });
            // all arrays should be the same size so just calculate the length to cut once
            let lengthToCut = GameStateManagerSingleton.target.length - actionNumber - 1;
            // put these new clones as the ones in the get functions by removing all entries after actionNumber then appending the clones
            GameStateManagerSingleton.target.splice(actionNumber+1, lengthToCut);
            GameStateManagerSingleton.dolls.splice(actionNumber+1, lengthToCut);
            GameStateManagerSingleton.actionRound.splice(actionNumber+1, lengthToCut);
            GameStateManagerSingleton.playerTurn.splice(actionNumber+1, lengthToCut);

            GameStateManagerSingleton.actionRound.push(GameStateManagerSingleton.actionRound[actionNumber]);
            GameStateManagerSingleton.playerTurn.push(GameStateManagerSingleton.playerTurn[actionNumber]);
            GameStateManagerSingleton.target.push(newTarget);
            GameStateManagerSingleton.dolls.push(newDolls);

            StatTracker.getInstance().rewindToAction(actionNumber);
            ChartMaker.getInstance().createDPSChart();
        }
        else
            console.error("Singleton not yet initialized");
    }

    setDollCalcType(calculationType, dollName) {
        if (GameStateManagerSingleton) {
            for (let i = 0; i < GameStateManagerSingleton.dolls[0].length; i++) {
                if (GameStateManagerSingleton.dolls[0][i].getName() == dollName)
                    GameStateManagerSingleton.calcTypes[i] = calculationType;
            }
        }
        else
            console.error("Singleton not yet initialized");
    }
    getDollCalcType(dollName) {
        if (GameStateManagerSingleton) {
            for (let i = 0; i < GameStateManagerSingleton.dolls[0].length; i++) {
                if (GameStateManagerSingleton.dolls[0][i].getName() == dollName)
                    return GameStateManagerSingleton.calcTypes[i];
            }
            console.error(`${dollName} does not exist in Game State Manager singleton`);
        }
        else
            console.error("Singleton not yet initialized");
    }
    // get whether player or enemy is currently playing their turn
    isPlayerActing() {
        if (GameStateManagerSingleton) {
            let readyDolls = 0;
            GameStateManagerSingleton.dolls[GameStateManagerSingleton.actionCount+1].forEach (doll => {
                readyDolls += doll.hasTurnAvailable();
            });
            if (readyDolls == 0)
                return false;
            return true;
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default GameStateManager;