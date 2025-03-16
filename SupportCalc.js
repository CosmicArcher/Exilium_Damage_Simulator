import DamageManager from "./DamageManager.js";
import Doll from "./Doll.js";
import ResourceLoader from "./ResourceLoader.js";
import GameStateManager from "./GameStateManager.js";
import RNGManager from "./RNGManager.js";
import EventManager from "./EventManager.js";
import TurnManager from "./TurnManager.js";
import ActionLog from "./ActionLog.js";
import Target from "./Target.js";
import {Elements, AmmoTypes, CalculationTypes, SkillJSONKeys, SkillNames} from "./Enums.js";

var selectedPhases = [];
var selectedDolls = [];
var selectedFortifications = [0];
var selectedSkill = "";
var numDolls = 1;
// papasha summon does not count towards the limit of 4 supports
var numSummons = 0;

var skillOptions;
var dollOptions;
var phaseDiv = [];
var fortOptions;
// for use when dynamically adding and removing doll slots
var slotColors = ["olive", "violet", "deeppink", "orange", "dodgerblue", "aquamarine"];

// an error gets thrown when putting resourceloader.getinstance() directly in the .on(click) functions
function getDolls() {
    return ResourceLoader.getInstance().getAllDolls();
}
// for cloning a whole column and removing select html elements
function spliceNodeList(nodeList, startIndex, numElements) {
    for (let i = 0; i < numElements; i++)
        nodeList[startIndex].remove();
}
// to track whether more supports are allowed to be added or not
function updateSupportCounter() {
    d3.select("#AddSupport").text(`Add Support ${numDolls-1-numSummons}/4`);
}
// adds a new removable slot
function addDoll() {
    numDolls++;
    updateSupportCounter();
    let newNode = d3.select("#Doll_1").node().cloneNode(true);
    newNode.id = "Doll_" + numDolls;
    newNode.children[0].innerHTML = "Doll: ";
    d3.select(newNode).style("background-color", slotColors[numDolls-1]);
    spliceNodeList(newNode.childNodes, 7, 5);

    let removeButton = d3.select(newNode).insert("button", "label");
    removeButton.text("Remove Doll")
                .style("float", "right")
                .style("margin-right", "50px");
    removeButton.on("click", event => {
        let dollIndex = +event.target.parentNode.id.slice(5) - 1;
        removeDoll(dollIndex);
    });


    phaseDiv.push(newNode.lastElementChild);
    selectedFortifications.push(0);
    selectedDolls.push();
    d3.select("#Dolls").node().appendChild(newNode);
    initializeDollButtons(numDolls - 1);
}
// remove index from all arrays and shift the ids and colors of later slots
function removeDoll(index) {
    // remove data at index from arrays
    selectedFortifications.splice(index, 1);
    d3.select(phaseDiv[index]).remove();
    phaseDiv.splice(index, 1);
    // if summon is deleted, do not reduce the support counter
    let doll = selectedDolls[index];
    if (doll == "Papasha Summon")
        numSummons--;
    selectedDolls.splice(index, 1);
    numDolls--;
    updateSupportCounter();
    // change the colors of the slots after the deleted one
    for (let i = index; i < numDolls; i++) {
        let shiftedSlot = document.getElementById("Doll_" + (i + 2));
        shiftedSlot.id = "Doll_" + (i + 1);
        d3.select(shiftedSlot).style("background-color", slotColors[i]);
    }
    // delete the html element
    d3.select("#Doll_" + (index + 1)).remove();
    // if papasha is deleted, remove her summon as well if it is not on the first slot
    if (doll == "Papasha") {
        for (let i = 1; i < numDolls; i++) {
            if (selectedDolls[i] == "Papasha Summon")
                removeDoll(i);
        }
    }
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

function getDollStats(index) {
    // doll, skill, atk, crit, critdmg, defignore, dmg, targeted, aoe, exposed, support, cover, stability, def, phase, physical, freeze, burn, corrosion, hydro, electric
    /*let dollStats = ["","", 0, 0, 1,        0,      0,      0,      0,  0,          0,      0,      0,      0,      0,  0,          0,      0,      0,      0,      0];
    dollStats[0] = selectedDolls[index];
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
    dollStats[20] = getValuefromInput("#ElectricDamage");*/

    let dollStats = [];
    d3.select("#Doll_" + (index + 1)).node().childNodes.forEach(d => {
        if (d.type == "text")
        dollStats.push(+d.value);
        if (d.childNodes.length > 0) {
            d.childNodes.forEach(datum => {
                if (datum.type == "text")
                dollStats.push(+datum.value);
            });
        }
    });
    return dollStats;
}

function checkSkillConditional(skillName, index) {
    // check if the doll's skill has a conditional inherently
    if (ResourceLoader.getInstance().getSkillData(selectedDolls[index])[skillName].hasOwnProperty(SkillJSONKeys.CONDITIONAL))
        return true;
    else {
        // check if the fortifications add a conditional to the skill
        let fortificationData = ResourceLoader.getInstance().getFortData(selectedDolls[index]);
        for (let i = 1; i <= selectedFortifications[index]; i++) {
            // check each fortification
            if (fortificationData.hasOwnProperty("V"+i)) {
                let fortification = fortificationData["V"+i];
                // check if the fortification modifies the skill
                if (fortification.hasOwnProperty(skillName)) {
                    // check if the modification adds a conditional
                    if (fortification[skillName].hasOwnProperty(SkillJSONKeys.CONDITIONAL))
                        return true;
                    // if not, continue checking the rest of the fortifications
                }
            }
        }
    }
    // if all fortifications have been checked and no conditional has still been found, return false
    return false;
}

function getDollSkills(index) {
    let dollSkills = ResourceLoader.getInstance().getSkillData(selectedDolls[index]);
    return Object.keys(dollSkills);
}

function createSkillDropdown() {
    let skills = getDollSkills(0);
    console.log(selectedDolls);
    // clear the selected skill text because of the new doll chosen
    if (skillOptions)
        skillOptions.remove();
    selectedSkill = "";
    d3.select("#SkillSelected").text("Skill: ");
    let conditionalDiv = d3.select("#Skill").node().nextElementSibling;
    d3.select(conditionalDiv).style("display", "none");
    d3.select(conditionalDiv.firstElementChild).node().checked = false;
    // change selected skill text when dropdown option is clicked
    skillOptions = d3.select("#Skill").append("div").attr("class", "dropdownBox").style("display", "none");
    skills.forEach(d => {
        skillOptions.append("a")
                    .text(d)
                    .on("click", () => {
                        selectedSkill = d;
                        d3.select("#SkillSelected").text("Skill: " + d);
                        // activate the damage calculation button once a skill has been selected
                        d3.select("#calculateButton").node().disabled = false;
                        // if the skill has a conditional, show the override tickbox, otherwise hide and deselect it
                        if (checkSkillConditional(d, 0)) 
                            d3.select(conditionalDiv).style("display", "block");                       
                        else {
                            d3.select(conditionalDiv).style("display", "none");    
                            d3.select(conditionalDiv.firstElementChild).node().checked = false;
                        }
                    });
    });
}

function updateSelectedDoll(index) {
    d3.select(document.getElementById("Doll_" + (index + 1)).children[+(index != 0)]).text("Doll: V" + selectedFortifications[index] + " " + selectedDolls[index]);
}
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
// when any button is pressed, hide all currently displayed dropdowns
function hideDropdowns() {
    elementOptions.style("display", "none");
    ammoOptions.style("display", "none");
    if (fortOptions)
        fortOptions.style("display", "none");
    phaseDiv.forEach(d => {
        if (d)
            d.style("display", "none");
    });
    if (skillOptions)
        skillOptions.style("display", "none");
}
// because initializing doll buttons will be repeated each time a new doll is added
function initializeDollButtons(index) {
    let dollNum = index + 1;
    let dollStats = document.getElementById("Doll_" + dollNum).children
    // if doll selection button is clicked, show a dropdown of all dolls in the skill json excluding currently selected dolls
    d3.select(dollStats[index == 0 ? 1 : 2]).on("click", () => {
        // if onclick is triggered by selecting from the dropdown, delete the dropdown
        if (dollOptions) {
            dollOptions.remove();
            dollOptions = null;
        }
        // otherwise create a new drop down since one was not displayed yet when the button was pressed
        else {
            // hide any other active dropdowns
            hideDropdowns();
            // create the dropdown list 
            dollOptions = d3.select(dollStats[index == 0 ? 1 : 2]).append("div").attr("class", "dropdownBox");
            // get all dolls excluding any already selected dolls, and Papasha summon if support slot
            let dollList = getDolls().filter(doll => {
                if (index == 0)
                    return !selectedDolls.includes(doll);
                return !selectedDolls.includes(doll) && doll != "Papasha Summon";
            });
            dollList.forEach(d => {
                dollOptions.append("a")
                            .text(d)
                            .on("click", (event) => {
                                let dollIndex = +event.target.parentNode.parentNode.parentNode.id.slice(5) - 1;
                                // if papasha was originally in this slot, remove her summon if it is not in slot 1
                                if (selectedDolls[dollIndex] == "Papasha") {
                                    for (let i = 1; i < numDolls; i++) {
                                        if (selectedDolls[i] == "Papasha Summon")
                                            removeDoll(i);
                                    }
                                }
                                selectedDolls[dollIndex] = d;
                                updateSelectedDoll(dollIndex);
                                // enable the skill and fortification dropdown buttons since a doll is now selected
                                if (dollIndex == 0)
                                    d3.select(dollStats[5]).node().disabled = false;
                                d3.select(dollStats[index == 0 ? 2 : 3]).node().disabled = false;
                                // disable the calculate damage button because a skill for the new doll 1 has not yet been selected
                                if (dollIndex == 0) {
                                    d3.select("#calculateButton").node().disabled = true;
                                    createSkillDropdown();
                                }
                                else {
                                    let conditionalDiv = document.getElementById("Doll_" + (dollIndex + 1)).children[4];
                                    if (getDollSkills(dollIndex).hasOwnProperty(SkillNames.SUPPORT)) {
                                        if (checkSkillConditional(SkillNames.SUPPORT, dollIndex)) {
                                            d3.select(conditionalDiv).style("display", "block");
                                        }
                                        else {
                                            d3.select(conditionalDiv).style("display", "none");
                                            d3.select(conditionalDiv.firstElementChild).node().checked = false;
                                        }
                                    }
                                }
                                // if papasha was selected, automatically create a new slot and lock it to her summon            
                                if (d == "Papasha" && !selectedDolls.includes("Papasha Summon")) {
                                    dollOptions.style("display", "none");
                                    numSummons++;
                                    addDoll();
                                    selectedDolls[numDolls-1] = "Papasha Summon";
                                    selectedFortifications[numDolls-1] = selectedFortifications[dollIndex];
                                    updateSelectedDoll(numDolls-1);
                                    spliceNodeList(document.getElementById("Doll_" + numDolls).childNodes,3,3);
                                }
                            });
            });
        }
    });
    // if fortification button is selected, show a list from V0-V6 to set the fortification of the doll
    d3.select(dollStats[index == 0 ? 2 : 3]).on("click", () => {
        // if dropdown list has not yet been created
        if (!fortOptions) {
            fortOptions = d3.select(dollStats[index == 0 ? 2 : 3]).append("div").attr("class", "dropdownBox").style("display", "none");
            for (let i = 0; i < 7; i++) {
                fortOptions.append("a")
                            .text("V" + i)
                            .on("click", (event) => {
                                let dollIndex = +event.target.parentNode.parentNode.parentNode.id.slice(5) - 1;
                                selectedFortifications[dollIndex] = i;
                                updateSelectedDoll(dollIndex);
                                // if the doll is papasha, also update her summon's fortification
                                if (selectedDolls[dollIndex] == "Papasha") {
                                    selectedDolls.forEach((d, index) => {
                                        if (d == "Papasha Summon") {
                                            selectedFortifications[index] = i;
                                            updateSelectedDoll(index);
                                        }
                                    });
                                }
                                // if a skill is already selected and gains a conditional because of the fortification, 
                                // show the override tickbox, otherwise hide and deselect it
                                if (dollIndex == 0) {
                                    if (selectedSkill != "") {
                                        let conditionalDiv = d3.select("#Skill").node().nextElementSibling;
                                        if (checkSkillConditional(selectedSkill, 0)) {
                                            d3.select(conditionalDiv).style("display", "block");
                                        }
                                        else {
                                            d3.select(conditionalDiv).style("display", "none");
                                            d3.select(conditionalDiv.firstElementChild).node().checked = false;
                                        }
                                    }
                                }
                                else {
                                    let conditionalDiv = document.getElementById("Doll_" + (dollIndex + 1)).children[4];
                                    if (getDollSkills(dollIndex).hasOwnProperty(SkillNames.SUPPORT)) {
                                        if (checkSkillConditional(SkillNames.SUPPORT, dollIndex)) {
                                            d3.select(conditionalDiv).style("display", "block");
                                        }
                                        else {
                                            d3.select(conditionalDiv).style("display", "none");
                                            d3.select(conditionalDiv.firstElementChild).node().checked = false;
                                        }
                                    }
                                }
                            });
            }
        } // if dropdown has already been created, reuse it by transferring it as a child of a new fortification button
        else {
            dollStats[index == 0 ? 2 : 3].appendChild(fortOptions.node());
        }
        // toggle the dropdown list
        if (fortOptions.style("display") == "none") { 
            hideDropdowns();
            fortOptions.style("display", "block");
        }
        else
            hideDropdowns();
    });
    // elemental damage show/hide toggle, construct the dropdown here so that it does not affect the size of the button
    phaseDiv[index] = d3.select(dollStats[dollStats.length-1]);
    d3.select(dollStats[dollStats.length - 2]).on("click", () => {
        if (phaseDiv[index].style("display") == "block") {
            hideDropdowns();
        }
        else {
            hideDropdowns();
            phaseDiv[index].style("display", "block");
        }
    });
    // if skill button is clicked, show a dropdown of the possible actions of doll 1
    if (index == 0) {
        d3.select(dollStats[5]).on("click", () => {
            if (skillOptions.style("display") == "none") {
                hideDropdowns();
                skillOptions.style("display", "block");
            }
            else
                hideDropdowns();
        });
    }
}

// initialize the singletons
{
DamageManager.getInstance();
GameStateManager.getInstance();
RNGManager.getInstance();
ResourceLoader.getInstance();
ResourceLoader.getInstance().loadBuffJSON();
ResourceLoader.getInstance().loadSkillJSON();
ResourceLoader.getInstance().loadFortJSON();
EventManager.getInstance();
TurnManager.getInstance();
ActionLog.getInstance();
}

// target stats dropdowns
{
    var elementOptions;
    var ammoOptions;

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
        if (elementOptions.style("display") == "none") {
            hideDropdowns();
            elementOptions.style("display", "block");
        }
        else
            hideDropdowns();
    });
    // if ammo button is clicked, show a dropdown of the 5 elements
    d3.select("#AmmoWeakness").on("click", () => {
        if (ammoOptions.style("display") == "none") {
            hideDropdowns();
            ammoOptions.style("display", "block");
        }
        else
            hideDropdowns();
    });
}
// add extra support slot, up to 4 non-summons
d3.select("#AddSupport").on("click", () => {
    if (numDolls - numSummons < 5)
        addDoll();
});

initializeDollButtons(0);

d3.select("#calculateButton").on("click", () => {
    hideDropdowns();
    // get input values
    let targetStats = getTargetStats();
    let dollStats = getDollStats();
    GameStateManager.getInstance().registerTarget(new Target("6p62", targetStats[0], targetStats[3], 2, targetStats[1]));
    let newTarget = GameStateManager.getInstance().getTarget();
    // this webpage has all buffs manually input rather than automatic
    newTarget.disableBuffs();
    GameStateManager.getInstance().addCover(targetStats[2]);
    newTarget.setDefenseBuffs(targetStats[4]);
    newTarget.setDamageTaken(targetStats[5]);
    newTarget.setTargetedDamageTaken(targetStats[6]);
    newTarget.setAoEDamageTaken(targetStats[7]);
    newTarget.setStabilityDamageModifier(targetStats[8]);
    newTarget.applyDRPerStab(targetStats[9]);
    newTarget.applyDRWithStab(targetStats[10]);

    let newDoll = new Doll(dollStats[0], dollStats[13], dollStats[2], dollStats[3], dollStats[4], selectedFortification);
    newDoll.disableBuffs();
    newDoll.setDamageDealt(dollStats[6]);
    newDoll.setDefenseIgnore(dollStats[5]);
    newDoll.setTargetedDamage(dollStats[7]);
    newDoll.setAoEDamage(dollStats[8]);
    newDoll.setExposedDamage(dollStats[9]);
    newDoll.setSupportDamage(dollStats[10]);
    newDoll.setCoverIgnore(dollStats[11]);
    newDoll.setStabilityDamageModifier(dollStats[12]);
    newDoll.setPhaseDamage(dollStats[14]);
    newDoll.setElementDamage(Elements.PHYSICAL, dollStats[15]);
    newDoll.setElementDamage(Elements.FREEZE, dollStats[16]);
    newDoll.setElementDamage(Elements.BURN, dollStats[17]);
    newDoll.setElementDamage(Elements.CORROSION, dollStats[18]);
    newDoll.setElementDamage(Elements.HYDRO, dollStats[19]);
    newDoll.setElementDamage(Elements.ELECTRIC, dollStats[20]);

    let conditionalOverride = d3.select("#ConditionalOverride").node().checked;
    TurnManager.getInstance().useDollSkill(newDoll, newTarget, dollStats[1], CalculationTypes.EXPECTED, conditionalOverride);
    d3.select("#ActionLog").insert("p","p").text("Expected Damage");
})

d3.select("#Doll_1").style("background-color", slotColors[0]);