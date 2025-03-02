import DamageManager from "./DamageManager.js";
import Doll from "./Doll.js";
import ResourceLoader from "./ResourceLoader.js";
import GameStateManager from "./GameStateManager.js";
import RNGManager from "./RNGManager.js";
import Target from "./Target.js";
import {Elements, AmmoTypes} from "./Enums.js";

// an error gets thrown when putting resourceloader.getinstance() directly in the .on(click) functions
function getDolls() {
    return ResourceLoader.getInstance().getAllDolls();
}

function getValuefromInput(fieldID) {
    let res = +d3.select(fieldID).node().value;
    if (res == "")
        return 0;
    return res;
}

function getTargetStats() {
    console.log(getValuefromInput("#targetDef"));
}

// initialize the singletons
DamageManager.getInstance();
GameStateManager.getInstance();
RNGManager.getInstance();
ResourceLoader.getInstance();
ResourceLoader.getInstance().loadBuffJSON();
ResourceLoader.getInstance().loadSkillJSON();

// target stats dropdowns
{
    var elementOptions;
    var ammoOptions;
    var selectedPhases = [];

    // change weakness text based on selected list, write none if empty
    function updatePhaseText() {
        let newText = "Phase Weaknesses:";
        if (selectedPhases.length == 0)
            newText += " None";
        else 
            selectedPhases.forEach(d => newText += " " + d);
        d3.select("#PhasesSelected").text(newText);
    }
    function selectPhase(phaseAttribute) {
        // check if phase is already in the list, if yes remove, otherwise add to the list
        let removedPhase = false;
        selectedPhases.forEach((d, i, a) => {
            if (d == phaseAttribute) {
                a.splice(i, 1);
                removedPhase = true;
            }
        });
        if (!removedPhase)
            selectedPhases.push(phaseAttribute);
        updatePhaseText();
    }

    elementOptions = d3.select("#ElementWeakness").append("div").attr("class", "dropdownBox").style("display", "none");
    Object.values(Elements).forEach(d => {
        elementOptions.append("a")
        .text(d)
        .on("click", () => {
            selectPhase(d);
        });
    });
    ammoOptions = d3.select("#AmmoWeakness").append("div").attr("class", "dropdownBox").style("display", "none");
    Object.values(AmmoTypes).forEach(d => {
        if (d != AmmoTypes.NONE) { // some attacks do not have an ammo type but there is no such thing as a "None" ammo weakness
            ammoOptions.append("a")
            .text(d)
            .on("click", () => {
                selectPhase(d);
            });
        }
    });
    // if element button is clicked, show a dropdown of the 6 elements
    d3.select("#ElementWeakness").on("click", () => {
        if (elementOptions.style("display") == "none")
        elementOptions.style("display", "block");
        else
        elementOptions.style("display", "none");
    });
    // if ammo button is clicked, show a dropdown of the 5 elements
    d3.select("#AmmoWeakness").on("click", () => {
        if (ammoOptions.style("display") == "none")
            ammoOptions.style("display", "block");
        else
            ammoOptions.style("display", "none");
    });
}
// doll stats dropdowns
{
    var dollOptions;
    var skillOptions;
    var phaseDiv;
    // if doll selection button is clicked, show a dropdown of all dolls in the skill json
    d3.select("#Doll").on("click", () => {
        // create the dropdown list if it is not yet created
        if (!dollOptions) {
            dollOptions = d3.select("#Doll").append("div").attr("class", "dropdownBox").style("display", "none");
            let dollList = getDolls();
            dollList.forEach(d => {
                dollOptions.append("a")
                            .text(d)
                            .on("click", () => {
                                d3.select("#DollSelected").text("Doll: " + d);
                            })
            });
        }
        // create the dropdown list
        if (dollOptions.style("display") == "none") 
            dollOptions.style("display", "block");
        else
            dollOptions.style("display", "none");
    });
    // change selected skill text when dropdown option is clicked
    skillOptions = d3.select("#Skill").append("div").attr("class", "dropdownBox").style("display", "none");
    ["Basic", "Skill2", "Skill3", "Ultimate", "Support"].forEach(d => {
        skillOptions.append("a")
                    .text(d)
                    .on("click", () => {
                        d3.select("#SkillSelected").text("Skill: " + d);
                    });
    });
    // elemental damage show/hide toggle, construct the dropdown here so that it does not affect the size of the button
    phaseDiv = d3.select("#PhaseInput");
    d3.select("#PhaseDamage").on("click", () => {
        if (phaseDiv.style("display") == "block") {
            phaseDiv.style("display", "none");
        }
        else {
            phaseDiv.style("display", "block");
        }
    });
    // if skill button is clicked, show a dropdown of the 5 possible actions of a doll
    d3.select("#Skill").on("click", () => {
        if (skillOptions.style("display") == "none")
            skillOptions.style("display", "block");
        else
            skillOptions.style("display", "none");
    });
}



d3.select("#calculateButton").on("click", () => {
    getTargetStats();
    /*GameStateManager.getInstance().registerTarget(new Target("6p62", 8046, 65, 2, ["Ice"], ["Medium", "Heavy"]));
    GameStateManager.getInstance().addCover(0.2);
    GameStateManager.getInstance().getTarget().setDefenseBuffs(-0.3);
    let newDoll = new Doll("Qiongjiu", 0, 2400, 0.2, 1.2, "none", 0);
    newDoll.setDamageDealt(0.2);
    let damage = DamageManager.getInstance().calculateDamage(newDoll, 2400*1.1, "Burn", "None", "AoE", 0, 0, 0);
    d3.select("")*/
})
d3.select("body").append("button").on("click", () => {
    GameStateManager.getInstance().registerTarget(new Target("6p62", 8046, 65, 2, ["Ice"], ["Medium", "Heavy"]));
    GameStateManager.getInstance().addCover(0.2);
    GameStateManager.getInstance().getTarget().setDefenseBuffs(-0.3);
    let newDoll = new Doll("Qiongjiu", 0, 2400, 0.2, 1.2, "none", 0);
    newDoll.setDamageDealt(0.2);
    let damage = DamageManager.getInstance().calculateDamage(newDoll, 2400*1.1, "Burn", "None", "AoE", 0, 0, 0);
    console.log(damage);
});