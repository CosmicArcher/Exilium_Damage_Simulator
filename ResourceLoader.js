let ResourceLoaderSingleton;

class ResourceLoader {
    constructor() {
        if (ResourceLoaderSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Resource Loader Instantiated");
            ResourceLoaderSingleton = this;
        }
    }

    static getInstance() {
        if (!ResourceLoaderSingleton)
            new ResourceLoader();
        return ResourceLoaderSingleton;
    }
    // load the data at the start of main.js
    loadBuffJSON() {
        d3.json("BuffData.json").then(d => ResourceLoaderSingleton.buffJSON = d);
    }
    loadSkillJSON(){
        d3.json("SkillData.json").then(d => ResourceLoaderSingleton.skillJSON = d);
    }
    // give the resulting json corresponding to buff or doll
    getBuffData(buffName) {
        if (ResourceLoaderSingleton) {
            if (ResourceLoaderSingleton.buffJSON.hasOwnProperty(buffName))
                return ResourceLoaderSingleton.buffJSON[buffName];
            else
                console.error("Buff Name does not exist");
        }
        else
            console.error("Singleton not yet initialized");
    }
    getSkillData(dollName) {
        if (ResourceLoaderSingleton) {
            if (ResourceLoaderSingleton.skillJSON.hasOwnProperty(dollName))
                return ResourceLoaderSingleton.skillJSON[dollName];
            else
                console.error("Doll Name does not exist");
        }
        else
            console.error("Singleton not yet initialized");
    }
    // for unit selection dropdown
    getAllDolls() {
        if (ResourceLoaderSingleton) {
            return Object.keys(ResourceLoaderSingleton.skillJSON);
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default ResourceLoader;