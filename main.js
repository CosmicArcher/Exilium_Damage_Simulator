import DamageManager from "./DamageManager.js";
import Doll from "./Doll.js";
import ResourceLoader from "./ResourceLoader.js";
import GameStateManager from "./GameStateManager.js";
import RNGManager from "./RNGManager.js";
import Target from "./Target.js";
import {Elements, AmmoTypes, SkillNames, CalculationTypes} from "./Enums.js";

var selectedPhases = [];
var selectedDoll;
var selectedSkill;

// an error gets thrown when putting resourceloader.getinstance() directly in the .on(click) functions
function getDolls() {
    return ResourceLoader.getInstance().getAllDolls();
}

function getValuefromInput(fieldID) {
    // convert the string to a number
    let res = +d3.select(fieldID).node().value;
    if (res == "")
        return 0;
    return res;
}

function getTargetStats() {
    // def, weaknesses, cover, stability, def buffs, damage taken, targeted, aoe, stab damage modifier, dr per stab, dr with stab 
    let targetStats = [0,[],0,  0,           0,          0,          0,       0,      0,                    0,           0];
    targetStats[0] = getValuefromInput("#targetDef");
    targetStats[1] = selectedPhases;
    targetStats[2] = getValuefromInput("#targetCover");
    targetStats[3] = getValuefromInput("#targetStability");
    targetStats[4] = getValuefromInput("#targetDefBuffs");
    targetStats[5] = getValuefromInput("#targetDamageTaken");
    targetStats[6] = getValuefromInput("#targetTargetedDamage");
    targetStats[7] = getValuefromInput("#targetAoEDamage");
    targetStats[8] = getValuefromInput("#targetStabilityMod");
    targetStats[9] = getValuefromInput("#targetDRPerStab");
    targetStats[10] = getValuefromInput("#targetDRWithStab");

    return targetStats;
}

function getDollStats() {
    // doll, skill, atk, crit, critdmg, defignore, dmg, targeted, aoe, exposed, support, cover, stability, def, phase, physical, freeze, burn, corrosion, hydro, electric
    let dollStats = ["","", 0, 0, 1,        0,      0,      0,      0,  0,          0,      0,      0,      0,      0,  0,          0,      0,      0,      0,      0];
    dollStats[0] = selectedDoll;
    dollStats[1] = selectedSkill;
    dollStats[2] = getValuefromInput("#dollAttack");
    dollStats[3] = getValuefromInput("#CritRate");
    dollStats[4] = getValuefromInput("#CritDamage");
    dollStats[5] = getValuefromInput("#DefIgnore");
    dollStats[6] = getValuefromInput("#DamageDealt");
    dollStats[7] = getValuefromInput("#TargetedDamageDealt");
    dollStats[8] = getValuefromInput("#AoEDamageDealt");
    dollStats[9] = getValuefromInput("#ExposedDamageDealt");
    dollStats[10] = getValuefromInput("#SupportDamageDealt");
    dollStats[11] = getValuefromInput("#CoverIgnore");
    dollStats[12] = getValuefromInput("#StabilityDamage");
    dollStats[13] = getValuefromInput("#dollDefense");
    dollStats[14] = getValuefromInput("#AllDamage");
    dollStats[15] = getValuefromInput("#PhysicalDamage");
    dollStats[16] = getValuefromInput("#FreezeDamage");
    dollStats[17] = getValuefromInput("#BurnDamage");
    dollStats[18] = getValuefromInput("#CorrosionDamage");
    dollStats[19] = getValuefromInput("#HydroDamage");
    dollStats[20] = getValuefromInput("#ElectricDamage");

    return dollStats;
}

// initialize the singletons
{
DamageManager.getInstance();
GameStateManager.getInstance();
RNGManager.getInstance();
ResourceLoader.getInstance();
ResourceLoader.getInstance().loadBuffJSON();
ResourceLoader.getInstance().loadSkillJSON();
}

// target stats dropdowns
{
    var elementOptions;
    var ammoOptions;

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
                                selectedDoll = d;
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
                        selectedSkill = d;
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
    // get input values
    let targetStats = getTargetStats();
    let dollStats = getDollStats();
    GameStateManager.getInstance().registerTarget(new Target("6p62", targetStats[0], targetStats[3], 2, targetStats[1]));
    let newTarget = GameStateManager.getInstance().getTarget();
    GameStateManager.getInstance().addCover(targetStats[2]);
    newTarget.setDefenseBuffs(targetStats[4]);
    newTarget.setDamageTaken(targetStats[5]);
    newTarget.setTargetedDamageTaken(targetStats[6]);
    newTarget.setAoEDamageTaken(targetStats[7]);
    newTarget.setStabilityDamageModifier(targetStats[8]);
    newTarget.applyDRPerStab(targetStats[9]);
    newTarget.applyDRWithStab(targetStats[10]);
    let newDoll = new Doll(dollStats[0], dollStats[13], dollStats[2], dollStats[3], dollStats[4], 0);
    newDoll.setDamageDealt(dollStats[6]);
    newDoll.setDefenseIgnore(dollStats[5]);
    newDoll.setTargetedDamage(dollStats[7]);
    newDoll.setAoEDamage(dollStats[8]);
    newDoll.setExposedDamage(dollStats[9]);
    newDoll.setSupportDamage(dollStats[10]);
    newDoll.setCoverIgnore(dollStats[11]);
    newDoll.setStabilityDamage(dollStats[12]);
    newDoll.setPhaseDamage(dollStats[14]);
    newDoll.setElementDamage("Physical", dollStats[15]);
    newDoll.setElementDamage("Freeze", dollStats[16]);
    newDoll.setElementDamage("Burn", dollStats[17]);
    newDoll.setElementDamage("Corrosion", dollStats[18]);
    newDoll.setElementDamage("Hydro", dollStats[19]);
    newDoll.setElementDamage("Electric", dollStats[20]);

    let damage = newDoll.getSkillDamage(dollStats[1], CalculationTypes.EXPECTED, 0);
    //damage = DamageManager.getInstance().calculateDamage(newDoll, 2400*1.1, "Burn", "None", "AoE", 0, 0, 0);
    d3.select("#DPSDealt").text(`Expected Damage: ${damage}`);
    damage = newDoll.getSkillDamage(dollStats[1], CalculationTypes.NOCRIT, 0);
    d3.select("#NoCrit").text(`No Crit Damage: ${damage}`);
    damage = newDoll.getSkillDamage(dollStats[1], CalculationTypes.CRIT, 0);
    d3.select("#CritDealt").text(`Crit Damage: ${damage}`);
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