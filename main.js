import DamageManager from "./DamageManager.js";
import Doll from "./Doll.js";
import ResourceLoader from "./ResourceLoader.js";
import GameStateManager from "./GameStateManager.js";
import RNGManager from "./RNGManager.js";
import Target from "./Target.js";

// initialize the singletons
DamageManager.getInstance();
GameStateManager.getInstance();
RNGManager.getInstance();
ResourceLoader.getInstance();
ResourceLoader.getInstance().loadBuffJSON();
ResourceLoader.getInstance().loadSkillJSON();

d3.select("body").append("button").on("click", () => {
    GameStateManager.getInstance().registerTarget(new Target("6p62", 8046, 65, 2, ["Ice"], ["Medium", "Heavy"]));
    let newDoll = new Doll("Qiongjiu", 0, 2400, 0.2, 1.2, "none", 0);
    let damage = DamageManager.getInstance().calculateDamage(newDoll, 2400*0.8, "Physical", "Medium", "Targeted", 0, 0, 0);
    console.log(damage);
});