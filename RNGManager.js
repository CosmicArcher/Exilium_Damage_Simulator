let RNGManagerSingleton;

class RNGManager {
    constructor() {
        if (RNGManagerSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("RNG Manager Instantiated");
            RNGManagerSingleton = this;
        }
    }

    static getInstance() {
        if (!RNGManagerSingleton)
            new RNGManager();
        return RNGManagerSingleton;
    }
    // use RNG when a "real" battle is being simulated
    getRNG() {
        return Math.random(); // check if value is below crit chance, crit if true, not crit otherwise
    }
}

export default RNGManager;