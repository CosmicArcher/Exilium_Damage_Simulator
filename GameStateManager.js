import Target from "./Target.js";

let GameStateManagerSingleton;

class GameStateManager {
    constructor() {
        if (GameStateManagerSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Game Manager Instantiated");
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
        }
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