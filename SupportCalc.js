import DamageManager from "./DamageManager.js";
import Doll from "./Doll.js";
import ResourceLoader from "./ResourceLoader.js";
import GameStateManager from "./GameStateManager.js";
import RNGManager from "./RNGManager.js";
import EventManager from "./EventManager.js";
import TurnManager from "./TurnManager.js";
import DollFactory from "./DollFactory.js";
import ActionLog from "./ActionLog.js";
import Target from "./Target.js";
import {Elements, AmmoTypes, CalculationTypes, SkillJSONKeys, SkillNames} from "./Enums.js";

var selectedPhases = [];
var selectedDolls = [""];
var selectedFortifications = [0];
var selectedKeys = [[0,0,0,0,0,0]];
var selectedSkill = "";
var numDolls = 1;
// papasha summon does not count towards the limit of 4 supports
var numSummons = 0;

var skillOptions;
var dollOptions;
var keyOptions;
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

function toggleSlotSize(dollNum) {
    if (document.getElementById("Doll_" + dollNum).className == "slotMaximized")
        minimizeSlots();
    else {
        minimizeSlots();
        maximizeSlot(dollNum);
    }
}

function maximizeSlot(dollNum) {
    let slot = document.getElementById("Doll_" + dollNum);
    slot.className = "slotMaximized";
    slot.firstElementChild.textContent = "-";
}

function minimizeSlots() {
    for (let i = 1; i <= numDolls; i++) {
        let slot = document.getElementById("Doll_" + i);
        slot.className = "slotMinimized";
        slot.firstElementChild.textContent = "+";
    }
}
// adds a new removable slot
function addDoll() {
    numDolls++;
    updateSupportCounter();
    let newNode = d3.select("#Doll_1").node().cloneNode(true);
    newNode.className = "slotMaximized";
    newNode.firstElementChild.textContent = "-";
    newNode.id = "Doll_" + numDolls;
    newNode.children[1].innerHTML = "Doll: ";
    d3.select(newNode).style("background-color", slotColors[numDolls-1]);
    console.log(newNode.children);
    spliceNodeList(newNode.children, 12, 2);

    let removeButton = d3.select(newNode).insert("button", "label");
    removeButton.text("Remove Doll")
                .style("float", "right")
                .style("margin-right", "20px");
    removeButton.on("click", event => {
        let dollIndex = +event.target.parentNode.id.slice(5) - 1;
        removeDoll(dollIndex);
    });

    phaseDiv.push(null);
    selectedFortifications.push(0);
    selectedDolls.push("");
    selectedKeys.push([0,0,0,0,0,0]);
    document.getElementById("Dolls").appendChild(newNode);
    // deactivate the fortification and key buttons until doll is selected
    newNode.children[4].disabled = true;
    newNode.children[6].disabled = true;
    newNode.children[8].disabled = true;
    newNode.children[10].disabled = true;
    newNode.children[7].textContent = "None";
    newNode.children[9].textContent = "None";
    newNode.children[11].textContent = "None";
    // if the phase buffs are open in the original div, close it
    d3.select(newNode.lastElementChild.lastElementChild).style("display", "none");
    // if the conditional toggles were open in the original, hide them
    updateConditionalToggles(numDolls - 1);

    initializeDollButtons(numDolls - 1);
}
// remove index from all arrays and shift the ids and colors of later slots
function removeDoll(index) {
    // remove data at index from arrays
    selectedFortifications.splice(index, 1);
    selectedKeys.splice(index, 1);
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

function getNestedInput(arr, htmlElement) {
    htmlElement.childNodes.forEach(d => {
        if (d.type == "text")
            arr.push(+d.value);
        else if (d.childNodes.length > 0)
            getNestedInput(arr, d);
    });
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
    let dollStats = [];
    getNestedInput(dollStats, document.getElementById("Doll_" + (index + 1)));

    return dollStats;
}

function getConditionalOverrides() {
    let overrides = [];
    let conditionalDiv = document.getElementById("Skill").nextElementSibling;
    overrides.push([]);
    // number of conditionals is 1/3 of the number of elements 
    for (let i = 0; i < conditionalDiv.children.length / 3; i++) {
        overrides[0].push(conditionalDiv.children[i*3].checked);
    }

    for (let i = 1; i < numDolls; i++) {
        conditionalDiv = document.getElementById("Doll_" + (index + 1)).children[5];
        overrides.push([]);
        for (let j = 0; j < conditionalDiv.children.length / 3; j++) {
            overrides[0].push(conditionalDiv.children[j*3].checked);
        }
    }
    return overrides;
}

function getSkillConditionals(skillName, index) {
    let conditionals = [];
    // get the doll's inherent skill conditionals
    let baseSkill = ResourceLoader.getInstance().getSkillData(selectedDolls[index])[skillName];
    if (baseSkill.hasOwnProperty(SkillJSONKeys.CONDITIONAL)) {
        baseSkill[SkillJSONKeys.CONDITIONAL].forEach(obj => {
            conditionals.push(obj);
        });
    }
    // check if the fortifications add a conditional to the skill
    let fortificationData = ResourceLoader.getInstance().getFortData(selectedDolls[index]);
    for (let i = 1; i <= selectedFortifications[index]; i++) {
        // check each fortification
        if (fortificationData.hasOwnProperty("V"+i)) {
            let fortification = fortificationData["V"+i];
            // check if the fortification modifies the skill
            if (fortification.hasOwnProperty(skillName)) {
                // check if the modification overwrites the conditional
                if (fortification[skillName].hasOwnProperty(SkillJSONKeys.CONDITIONAL)) {
                    conditionals = [];
                    fortification[skillName][SkillJSONKeys.CONDITIONAL].forEach(obj => {
                        conditionals.push(obj);
                    });
                }
                // check if the modification appends to the conditionals instead
                if (fortification[skillName].hasOwnProperty(SkillJSONKeys.APPEND)) {
                    if (fortification[skillName][SkillJSONKeys.APPEND].hasOwnProperty(SkillJSONKeys.CONDITIONAL)) {
                        fortification[skillName][SkillJSONKeys.APPEND][SkillJSONKeys.CONDITIONAL].forEach(obj => {
                            conditionals.push(obj);
                        });
                    }
                }
            }
        }
    }
    // check the currently equipped keys if they add conditionals
    let keyData = getDollKeys(index);
    for (let i = 0; i < 6; i++) {
        // check if the key is equipped
        if (selectedKeys[index][i]) {
            // check if the key modifies a skill
            if (keyData[Object.keys(keyData)[i]].hasOwnProperty("Skill")) {
                let skill = keyData[Object.keys(keyData)[i]]["Skill"];
                // check each skill modified by the key
                Object.keys(skill).forEach(skill_name => {
                    if (skillName == skill_name) {
                        //check if modification overwrites the conditional
                        if (skill[skill_name].hasOwnProperty(SkillJSONKeys.CONDITIONAL)) {
                            conditionals = [];
                            skill[skill_name][SkillJSONKeys.CONDITIONAL].forEach(obj => {
                                conditionals.push(obj);
                            });
                        }
                        // check if key appends a conditional rather than overwriting it
                        if (skill[skill_name].hasOwnProperty(SkillJSONKeys.APPEND)) {
                            if (skill[skill_name][SkillJSONKeys.APPEND].hasOwnProperty(SkillJSONKeys.CONDITIONAL)) {
                                skill[skill_name][SkillJSONKeys.APPEND][SkillJSONKeys.CONDITIONAL].forEach(obj => {
                                    conditionals.push(obj);
                                });
                            }
                        }
                    }
                });
            }
        }
    }
    return conditionals;
}
// adjust the conditionalDiv content based on how many conditionals are present in the doll's skill
function updateConditionalToggles(index) {
    let skillConditionals;
    let conditionalDiv;
    console.log(selectedDolls);
    // get the skill conditionals and 
    if (index == 0) {
        skillConditionals = getSkillConditionals(selectedSkill, index);
        conditionalDiv = document.getElementById("Skill").nextElementSibling;
    }
    else {
        // update function can be called on new slot generation hence selected doll at index may still be blank
        if (selectedDolls[index] != "")
            skillConditionals = getSkillConditionals(SkillNames.SUPPORT, index);
        else
            skillConditionals = [];
        // support units do not have the skill html element so we get them by traversing through the html children array
        conditionalDiv = document.getElementById("Doll_" + (index + 1)).children[13];
    }
    if (skillConditionals.length > 0) {
        d3.select(conditionalDiv).style("display", "block");
        // adjust the number of toggles to match the number of conditionals
        while (skillConditionals.length > conditionalDiv.children.length / 3) {
            d3.select(conditionalDiv).append("input").attr("type", "checkbox");
            d3.select(conditionalDiv).append("label");
            d3.select(conditionalDiv).append("br");
        }
        if (skillConditionals.length < conditionalDiv.children.length / 3) 
            spliceNodeList(conditionalDiv.children, 3, conditionalDiv.children.length - skillConditionals.length * 3);
        // apply each condition description to the toggle text
        skillConditionals.forEach((condition, index) => {
            conditionalDiv.children[index * 3].nextSibling.textContent = condition[SkillJSONKeys.CONDITION_TEXT] + " Condition Met";
        });
    }
    else {
        d3.select(conditionalDiv).style("display", "none");
        conditionalDiv.firstElementChild.checked = false;
        // delete any excess toggles when disabled
        if (conditionalDiv.children.length > 3) 
            spliceNodeList(conditionalDiv.children, 3, conditionalDiv.children.length - 3);
    }
}

// get the skill keys of doll at index
function getDollSkills(index) {
    let dollSkills = ResourceLoader.getInstance().getSkillData(selectedDolls[index]);
    return Object.keys(dollSkills);
}
// get the key data of doll at index
function getDollKeys(index) {
    return ResourceLoader.getInstance().getKeyData(selectedDolls[index]);
}
// for doll slot 1, all other slots use support if possible
function createSkillDropdown() {
    let skills = getDollSkills(0);
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
                        updateConditionalToggles(0);
                    });
    });
}
// create the dropdown for the keys
function createKeyDropdown(index, htmlElement) {
    console.log(index);
    let keys = Object.keys(getDollKeys(index));
    // remove key button
    keys.push("None");
    // only show keys that have not yet been equipped and "None"
    let filteredKeys = keys.filter((d, key_index) => {
        return !selectedKeys[index][key_index];
    });
    console.log(filteredKeys);
    keyOptions = d3.select(htmlElement).append("div").attr("class", "dropdownBox").style("display", "none");
    filteredKeys.forEach(key_name => {
        keyOptions.append("a")
                    .text(key_name)
                    .on("click", (event) => {
                        let dollIndex = +event.target.parentNode.parentNode.parentNode.id.slice(5) - 1;
                        let keyDisplay = event.target.parentNode.parentNode.nextElementSibling;
                        if (key_name != "None") {
                            // if a key has already been selected in this slot, deselect it in the selected keys
                            if (keyDisplay.textContent != "None") 
                                selectedKeys[dollIndex][keys.indexOf(keyDisplay.textContent)] = 0;
                            // add the key in the selected keys of the doll
                            selectedKeys[dollIndex][keys.indexOf(key_name)] = 1;
                            keyDisplay.textContent = key_name;
                        }
                        else {
                            // if a key has already been selected in this slot, deselect it in the selected keys
                            if (keyDisplay.textContent != "None") 
                                selectedKeys[dollIndex][keys.indexOf(keyDisplay.textContent)] = 0;
                            keyDisplay.textContent = "None";
                        }
                    });
    });
}

function updateSelectedDoll(index) {
    d3.select(document.getElementById("Doll_" + (index + 1)).children[index == 0 ? 1 : 2]).text("Doll: V" + selectedFortifications[index] + " " + selectedDolls[index]);
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
    if (skillOptions)
        skillOptions.style("display", "none");
    if (keyOptions)
        keyOptions.style("display", "none");
}
// because initializing doll buttons will be repeated each time a new doll is added
function initializeDollButtons(index) {
    let dollNum = index + 1;
    let dollStats = document.getElementById("Doll_" + dollNum).children
    // if the minimize/maximize button is clicked, maximize the slot and minimize all other slots or minimize the slot.
    d3.select(dollStats[0]).on("click", () => {
        toggleSlotSize(dollNum);
    });
    // if doll selection button is clicked, show a dropdown of all dolls in the skill json excluding currently selected dolls
    d3.select(dollStats[index == 0 ? 2 : 3]).on("click", () => {
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
            dollOptions = d3.select(dollStats[index == 0 ? 2 : 3]).append("div").attr("class", "dropdownBox");
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
                                if (dollIndex == 0) // only slot 1 can choose a skill, all others can only use support attacks
                                    d3.select(dollStats[13]).node().disabled = false;
                                d3.select(dollStats[index == 0 ? 3 : 4]).node().disabled = false;
                                d3.select(dollStats[index == 0 ? 5 : 6]).node().disabled = false;
                                d3.select(dollStats[index == 0 ? 7 : 8]).node().disabled = false;
                                d3.select(dollStats[index == 0 ? 9 : 10]).node().disabled = false;
                                // disable the calculate damage button because a skill for the new doll 1 has not yet been selected
                                if (dollIndex == 0) {
                                    d3.select("#calculateButton").node().disabled = true;
                                    createSkillDropdown();
                                }
                                else {
                                    // check if the support skills have conditionals
                                    if (getDollSkills(dollIndex).hasOwnProperty(SkillNames.SUPPORT)) {
                                        updateConditionalToggles(dollIndex-1);
                                    }
                                }
                                // if papasha was selected, automatically create a new slot and lock it to her summon            
                                if (d == "Papasha" && !selectedDolls.includes("Papasha Summon")) {
                                    dollOptions.style("display", "none");
                                    numSummons++;
                                    // create papasha summon doll slot but minimize it and keep the papasha slot maximized
                                    addDoll();
                                    minimizeSlots();
                                    maximizeSlot(dollIndex + 1);
                                    // create papasha summon on the last doll slot
                                    selectedDolls[numDolls-1] = "Papasha Summon";
                                    selectedFortifications[numDolls-1] = selectedFortifications[dollIndex];
                                    // update the text to show the summon name and fortification matching papasha
                                    updateSelectedDoll(numDolls-1);
                                    // delete the doll and fortification buttons of the summon to prevent changing it
                                    spliceNodeList(document.getElementById("Doll_" + numDolls).childNodes,5,17);
                                }
                            });
            });
        }
    });
    // if fortification button is selected, show a list from V0-V6 to set the fortification of the doll
    d3.select(dollStats[index == 0 ? 3 : 4]).on("click", () => {
        // if dropdown list has not yet been created
        if (!fortOptions) {
            fortOptions = d3.select(dollStats[index == 0 ? 3 : 4]).append("div").attr("class", "dropdownBox").style("display", "none");
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
                                        updateConditionalToggles(0);
                                    }
                                }
                                else {
                                    // if not in slot 1, only check if support with current fortification has conditional
                                    if (getDollSkills(dollIndex).hasOwnProperty(SkillNames.SUPPORT)) {
                                        updateConditionalToggles(dollIndex-1);
                                    }
                                }
                            });
            }
        } // if dropdown has already been created, reuse it by transferring it as a child of a new fortification button
        else {
            dollStats[index == 0 ? 3 : 4].appendChild(fortOptions.node());
        }
        // toggle the dropdown list
        if (fortOptions.style("display") == "none") { 
            hideDropdowns();
            fortOptions.style("display", "block");
        }
        else
            hideDropdowns();
    });
    // if one of the 3 key slots is selected, show the unequipped keys of the doll and "None" to deselect
    for (let i = 0; i < 3; i++) {
        d3.select(dollStats[index == 0 ? 5 + i * 2 : 6 + i * 2]).on("click", (event) => {
            let dollIndex = +event.target.parentNode.id.slice(5) - 1;
            if (!keyOptions)
                createKeyDropdown(dollIndex, event.target);
            // toggle the dropdown list
            if (keyOptions.style("display") == "none") { 
                hideDropdowns();
                keyOptions.style("display", "block");
            }
            else {
                hideDropdowns();
                keyOptions.remove();
                keyOptions = null;
            }
        });
    }
    // elemental damage show/hide toggle, construct the dropdown here so that it does not affect the size of the button
    phaseDiv[index] = d3.select(dollStats[dollStats.length-1].lastElementChild);
    d3.select(dollStats[dollStats.length-1].lastElementChild.previousElementSibling).on("click", () => {
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
        d3.select(dollStats[13]).on("click", () => {
            if (skillOptions.style("display") == "none") {
                hideDropdowns();
                skillOptions.style("display", "block");
            }
            else
                hideDropdowns();
        });
    }
}

function createDollsFromInput() {
    let dolls = [];
    for (let i = 0; i < numDolls; i++) {
        let dollStats = getDollStats(i)
        let newDoll = DollFactory.getInstance().createDoll(selectedDolls[i], dollStats[11], dollStats[0], dollStats[1], dollStats[2], selectedFortifications[i]);
        //newDoll.disableBuffs();
        newDoll.finishCloning();
        newDoll.setDamageDealt(dollStats[4]);
        newDoll.setDefenseIgnore(dollStats[3]);
        newDoll.setTargetedDamage(dollStats[5]);
        newDoll.setAoEDamage(dollStats[6]);
        newDoll.setSlowedDamage(dollStats[7]);
        newDoll.setSupportDamage(dollStats[8]);
        newDoll.setCoverIgnore(dollStats[9]);
        newDoll.setStabilityDamageModifier(dollStats[10]);
        newDoll.setPhaseDamage(dollStats[12]);
        newDoll.setElementDamage(Elements.PHYSICAL, dollStats[13]);
        newDoll.setElementDamage(Elements.FREEZE, dollStats[14]);
        newDoll.setElementDamage(Elements.BURN, dollStats[15]);
        newDoll.setElementDamage(Elements.CORROSION, dollStats[16]);
        newDoll.setElementDamage(Elements.HYDRO, dollStats[17]);
        newDoll.setElementDamage(Elements.ELECTRIC, dollStats[18]);
        dolls.push(newDoll);
    }
    return dolls;
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
ResourceLoader.getInstance().loadKeyJSON();
EventManager.getInstance();
TurnManager.getInstance();
ActionLog.getInstance();
DollFactory.getInstance();
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
    hideDropdowns();
    minimizeSlots();
    if (numDolls - numSummons < 5)
        addDoll();
});

initializeDollButtons(0);

d3.select("#calculateButton").on("click", () => {
    hideDropdowns();
    TurnManager.getInstance().resetLists();
    // get input values
    let targetStats = getTargetStats();
    let dollStats = getDollStats(0);
    GameStateManager.getInstance().registerTarget(new Target("6p62", targetStats[0], targetStats[3], 2, targetStats[1]));
    let newTarget = GameStateManager.getInstance().getTarget();
    newTarget.finishCloning();
    // this webpage has all buffs manually input rather than automatic
    //newTarget.disableBuffs();
    GameStateManager.getInstance().addCover(targetStats[2]);
    newTarget.setDefenseBuffs(targetStats[4]);
    newTarget.setDamageTaken(targetStats[5]);
    newTarget.setTargetedDamageTaken(targetStats[6]);
    newTarget.setAoEDamageTaken(targetStats[7]);
    newTarget.setStabilityDamageModifier(targetStats[8]);
    newTarget.applyDRPerStab(targetStats[9]);
    newTarget.applyDRWithStab(targetStats[10]);

    /*let newDoll = DollFactory.getInstance().createDoll(selectedDolls[0], dollStats[11], dollStats[0], dollStats[1], dollStats[2], selectedFortifications[0]);
    newDoll.disableBuffs();
    newDoll.setDamageDealt(dollStats[4]);
    newDoll.setDefenseIgnore(dollStats[3]);
    newDoll.setTargetedDamage(dollStats[5]);
    newDoll.setAoEDamage(dollStats[6]);
    newDoll.setExposedDamage(dollStats[7]);
    newDoll.setSupportDamage(dollStats[8]);
    newDoll.setCoverIgnore(dollStats[9]);
    newDoll.setStabilityDamageModifier(dollStats[10]);
    newDoll.setPhaseDamage(dollStats[12]);
    newDoll.setElementDamage(Elements.PHYSICAL, dollStats[13]);
    newDoll.setElementDamage(Elements.FREEZE, dollStats[14]);
    newDoll.setElementDamage(Elements.BURN, dollStats[15]);
    newDoll.setElementDamage(Elements.CORROSION, dollStats[16]);
    newDoll.setElementDamage(Elements.HYDRO, dollStats[17]);
    newDoll.setElementDamage(Elements.ELECTRIC, dollStats[18]);*/
    let newDolls = createDollsFromInput();

    //let conditionalOverride = d3.select("#ConditionalOverride").node().checked;
    let conditionalOverride = getConditionalOverrides();
    // the first doll is the primary attacker, all others support if applicable
    TurnManager.getInstance().useDollSkill(newDolls[0], newTarget, selectedSkill, CalculationTypes.EXPECTED, conditionalOverride[0]);
    d3.select("#ActionLog").insert("p","p").text("Expected Damage");
})

d3.select("#Doll_1").style("background-color", slotColors[0]);