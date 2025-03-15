import Target from "./Target.js";

let GameStateManagerSingleton;

class GameStateManager {
    constructor() {
        if (GameStateManagerSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Game State Manager Instantiated");
            GameStateManagerSingleton = this;
            // track total damage dealt and end turn on every unit
            GameStateManagerSingleton.resetSimulation();
        }
    }

    static getInstance() {
        if (!GameStateManagerSingleton)
            new GameStateManager();
        return GameStateManagerSingleton;
    }
    // track total damage for ease of strat comparison
    addTotalDamage(x) {
        if (GameStateManagerSingleton)
            GameStateManagerSingleton.totalDamage += x;
        else
            console.error("Singleton not yet initialized");
    }
    getTotalDamage() {
        if (GameStateManagerSingleton)
            return GameStateManagerSingleton.totalDamage;
        else
            console.error("Singleton not yet initialized");
    }
    // return to a clean slate to test a completely different setup
    resetSimulation() {
        if (GameStateManagerSingleton) {
            GameStateManagerSingleton.totalDamage = 0;
            GameStateManagerSingleton.target = null;
            GameStateManagerSingleton.coverValue = 0;
        }
        else
            console.error("Singleton not yet initialized");
    }
    // game state manager holds reference to the target
    registerTarget(target) {
        if (GameStateManagerSingleton) {
            GameStateManagerSingleton.target = target;
        }
        else
            console.error("Singleton not yet initialized");
    }
    getTarget() {
        if (GameStateManagerSingleton) {
            return GameStateManagerSingleton.target;
        }
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
    // let the target perform their turn, ticking down any buffs/debuffs
    endTurn() {
        if (GameStateManagerSingleton) {
            GameStateManagerSingleton.target.endTurn();
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default GameStateManager;