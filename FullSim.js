import DamageManager from "./DamageManager.js";
import ResourceLoader from "./ResourceLoader.js";
import GameStateManager from "./GameStateManager.js";
import RNGManager from "./RNGManager.js";
import EventManager from "./EventManager.js";
import TurnManager from "./TurnManager.js";
import GlobalBuffManager from "./GlobalBuffManager.js"
import DollFactory from "./DollFactory.js";
import ActionLog from "./ActionLog.js";
import Target from "./Target.js";
import {Elements, AmmoTypes, CalculationTypes, SkillJSONKeys, SkillNames} from "./Enums.js";

var selectedPhases = [];
var selectedDolls = [""];
var selectedFortifications = [0];
var selectedKeys = [[0,0,0,0,0,0]];
var calcSettings = [CalculationTypes.EXPECTED];
var numDolls = 1;
// papasha summon does not count towards the limit of 4 supports
var numSummons = 0;

var dollOptions;
var keyOptions;
var phaseDiv = [null];
var fortOptions;
var calcOptions;
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
    d3.select("#AddSupport").text(`Add Doll ${numDolls-1}/4`);
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
    let newNode = document.getElementById("Doll_1").cloneNode(true);
    newNode.className = "slotMaximized";
    newNode.firstElementChild.textContent = "-";
    newNode.id = "Doll_" + numDolls;
    newNode.children[1].innerHTML = "Doll: ";
    d3.select(newNode).style("background-color", slotColors[numDolls-1]);

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

    initializeDollButtons(numDolls - 1);

    // add a row under the calculation settings section
    addCalcOption();
    // add a new hidden batch of conditional toggles
    addConditionalToggle();
}

function addConditionalToggle() {
    let newToggle = document.getElementById("Conditional_1").cloneNode(true);
    newToggle.id = "Conditional_" + (numDolls + numSummons);
    document.getElementById("ConditionalHolder").appendChild(newToggle);
}

function addCalcOption() {
    // add a row under the calculation settings section
    let newSetting = document.getElementById("CalcSettings").children[1].cloneNode(true);
    newSetting.firstChild.textContent = "Doll: ";
    newSetting.firstElementChild.textContent = "Calculation";
    newSetting.id = "Settings_" + (numDolls + numSummons);
    d3.select(newSetting.lastElementChild).on("click", () => {
        // reuse the dropdown among all buttons for this setting
        newSetting.lastElementChild.appendChild(calcOptions.node());
        // toggle the dropdown list
        if (calcOptions.style("display") == "none") { 
            hideDropdowns();
            calcOptions.style("display", "block");
        }
        else
            hideDropdowns();
    });
    // add a line break to get spacing between each row
    d3.select("#CalcSettings").append("br");
    document.getElementById("CalcSettings").appendChild(newSetting);
    calcSettings.push(CalculationTypes.EXPECTED);
}
// remove index from all arrays and shift the ids and colors of later slots
function removeDoll(index) {
    // remove data at index from arrays
    selectedFortifications.splice(index, 1);
    selectedKeys.splice(index, 1);
    d3.select(phaseDiv[index]).remove();
    phaseDiv.splice(index, 1);
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
    // remove the doll's entry in the calculation settings section too
    calcSettings.splice(index, 1);
    spliceNodeList(document.getElementById("CalcSettings").children, 2 * index + 1, 2);
    // remove their respective conditional toggles
    d3.select("#Conditional_" + (index + 1)).remove();
    // shift the id numbers of the ones after that set
    for (let i = index; i < numDolls + numSummons; i++) {
        let shiftedSlot = document.getElementById("Conditional_" + (i + 2));
        shiftedSlot.id = "Conditional_" + (i + 1);
    }
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
            // get all dolls excluding any already selected dolls, and Papasha summon
            let dollList = getDolls().filter(doll => {
                return !selectedDolls.includes(doll) && doll != "Papasha Summon";
            });
            dollList.forEach(d => {
                dollOptions.append("a")
                            .text(d)
                            .on("click", (event) => {
                                let dollIndex = +event.target.parentNode.parentNode.parentNode.id.slice(5) - 1;
                                selectedDolls[dollIndex] = d;
                                updateSelectedDoll(dollIndex);
                                // enable the fortification dropdown button since a doll is now selected
                                dollStats[index == 0 ? 3 : 4].disabled = false;
                                dollStats[index == 0 ? 5 : 6].disabled = false;
                                dollStats[index == 0 ? 7 : 8].disabled = false;
                                dollStats[index == 0 ? 9 : 10].disabled = false;
                                // clear the displayed keys from the previous doll
                                dollStats[index == 0 ? 6 : 7].textContent = "None";
                                dollStats[index == 0 ? 8 : 9].textContent = "None";
                                dollStats[index == 0 ? 10 : 11].textContent = "None";
                                selectedKeys[dollIndex] = [0,0,0,0,0,0];
                                // selecting doll 1 enables the start button
                                if (dollIndex == 0) {
                                    d3.select("#startButton").node().disabled = false;
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
}

function createDollsFromInput() {
    let dolls = [];
    for (let i = 0; i < numDolls; i++) {
        let dollStats = getDollStats(i)
        let newDoll = DollFactory.getInstance().createDoll(selectedDolls[i], dollStats[13], dollStats[0], dollStats[1], dollStats[2], 
            selectedFortifications[i], selectedKeys[i]);
        //newDoll.disableBuffs();
        newDoll.finishCloning();
        newDoll.setDamageDealt(dollStats[4]);
        newDoll.setDefenseIgnore(dollStats[3]);
        newDoll.setTargetedDamage(dollStats[5]);
        newDoll.setAoEDamage(dollStats[6]);
        newDoll.setSlowedDamage(dollStats[7]);
        newDoll.setDefDownDamage(dollStats[8]);
        newDoll.setSupportDamage(dollStats[9]);
        newDoll.setCoverIgnore(dollStats[10]);  
        newDoll.setStabilityDamageModifier(dollStats[11]);
        newDoll.setStabilityIgnore(dollStats[12]);
        newDoll.setPhaseDamage(dollStats[14]);
        newDoll.setElementDamage(Elements.PHYSICAL, dollStats[15]);
        newDoll.setElementDamage(Elements.FREEZE, dollStats[16]);
        newDoll.setElementDamage(Elements.BURN, dollStats[17]);
        newDoll.setElementDamage(Elements.CORROSION, dollStats[18]);
        newDoll.setElementDamage(Elements.HYDRO, dollStats[19]);
        newDoll.setElementDamage(Elements.ELECTRIC, dollStats[20]);
        dolls.push(newDoll);
        // papasha summon inherits the same atk, def, hp but not damage buffs or crit
        if (selectedDolls[i] == "Papasha") {
            let newDoll = DollFactory.getInstance().createDoll("Papasha Summon", dollStats[13], dollStats[0], dollStats[1], dollStats[2], 
                selectedFortifications[i], selectedKeys[i]);
            newDoll.finishCloning();
            dolls.push(newDoll);
            numSummons++;
            selectedDolls.push("Papasha Summon");
            selectedFortifications.push(selectedFortifications[i]);

            addCalcOption();
            document.getElementById("Settings_" + (numDolls + 1)).firstChild.textContent = selectedDolls[numDolls];
        }
    }
    return dolls;
}
// create the dropdown for the keys
function createKeyDropdown(index, htmlElement) {
    let keys = Object.keys(getDollKeys(index));
    // remove key button
    keys.push("None");
    // only show keys that have not yet been equipped and "None"
    let filteredKeys = keys.filter((d, key_index) => {
        return !selectedKeys[index][key_index];
    });
    keyOptions = d3.select(htmlElement).append("div").attr("class", "dropdownBox").style("display", "none");
    filteredKeys.forEach(key_name => {
        keyOptions.append("a")
                    .text(key_name)
                    .on("click", (event) => {
                        let dollIndex = +event.target.parentNode.parentNode.parentNode.id.slice(5) - 1;
                        let keyDisplay = event.target.parentNode.parentNode.nextElementSibling;
                        if (key_name != "None") {
                            // if a key has already been selected in this slot, deselect it in the selected keys
                            if (keyDisplay.textContent != "None") {
                                selectedKeys[dollIndex][keys.indexOf(keyDisplay.textContent)] = 0;
                            }
                            // add the key in the selected keys of the doll
                            selectedKeys[dollIndex][keys.indexOf(key_name)] = 1;
                            keyDisplay.textContent = key_name;
                        }
                        else {
                            // if a key has already been selected in this slot, deselect it in the selected keys
                            if (keyDisplay.textContent != "None") {
                                selectedKeys[dollIndex][keys.indexOf(keyDisplay.textContent)] = 0;
                            }
                            keyDisplay.textContent = "None";
                        }
                    });
    });
}
// when any button is pressed, hide all currently displayed dropdowns
function hideDropdowns() {
    if (elementOptions)
        elementOptions.style("display", "none");
    if (ammoOptions)
        ammoOptions.style("display", "none");
    if (fortOptions)
        fortOptions.style("display", "none");
    if (skillOptions)
        skillOptions.style("display", "none");
    if (keyOptions)
        keyOptions.style("display", "none");
    phaseDiv.forEach(div => {
        div.style("display", "none");
    });
    if (calcOptions)
        calcOptions.style("display", "none");
    // just delete the current buff display if it exists since the list always changes
    if (currentBuffs) {
        currentBuffs.remove();
        currentBuffs = null;
    }
    if (statDropdown)
        statDropdown.style("display", "none");
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
    let targetStats = [];
    getNestedInput(targetStats, document.getElementById("TargetColumn"));

    return targetStats;
}

function getGlobalStats() {
    let arr = [];
    getNestedInput(arr, document.getElementById("GlobalBuffs"));

    return arr;
}

function getDollStats(index) {
    let dollStats = [];
    getNestedInput(dollStats, document.getElementById("Doll_" + (index + 1)));

    return dollStats;
}

function getConditionalOverrides() {
    let overrides = [];
    // number of conditionals is 1/3 of the number of elements 
    for (let i = 0; i < numDolls + numSummons; i++) {
        conditionalDiv = document.getElementById("Conditional_" + (i + 1));
        overrides.push([]);
        for (let j = 0; j < conditionalDiv.children.length / 3; j++) {
            overrides[i].push(conditionalDiv.children[j*3 + 1].checked);
        }
    }
    return overrides;
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

function updateSelectedDoll(index) {
    document.getElementById("Doll_" + (index + 1)).children[index == 0 ? 1 : 2].textContent = "Doll: V" + selectedFortifications[index] + " " + selectedDolls[index];
    document.getElementById("Settings_" + (index + 1)).firstChild.textContent = selectedDolls[index];
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
GlobalBuffManager.getInstance();
}

// target stats dropdowns
{
    var elementOptions;
    var ammoOptions;

    elementOptions = d3.select("#ElementWeakness").append("div").attr("class", "dropdownBox").style("display", "none");
    Object.values(Elements).forEach(d => {
        if (d != Elements.PHYSICAL) {
            elementOptions.append("a")
            .text(d)
            .on("click", () => {
                selectPhase(d);
            });
        }
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
    d3.select("#TargetColumn").insert("button", "h2")
                                .text("-")
                                .style("float", "right")
                                .style("margin-right", "10px")
                                .on("click", (event) => {
                                    // check which state the button is to determine whether to maximize or minimize the target card
                                    if (event.target.textContent == "-") {
                                        event.target.textContent = "+";
                                        event.target.parentNode.className = "slotMinimized";
                                    }
                                    else {
                                        event.target.textContent = "-";
                                        event.target.parentNode.className = "slotMaximized";
                                    }
                                });
}
// add extra support slot, up to 4 non-summons
d3.select("#AddSupport").on("click", () => {
    hideDropdowns();
    minimizeSlots();
    if (numDolls < 5)
        addDoll();
});

initializeDollButtons(0);

// initialize calc settings dropdown
{
    calcOptions = d3.select(document.getElementById("Settings_1").lastElementChild).append("div").attr("class", "dropdownBox").style("display", "none");
    Object.values(CalculationTypes).forEach(type  => {
        calcOptions.append("a")
                    .text(type)
                    .on("click", (event) => {
                        // update the setting for the doll this setting belongs to
                        let dollIndex = +event.target.parentNode.parentNode.parentNode.id.slice(9) - 1;
                        calcSettings[dollIndex] = type;
                        // update the button text
                        event.target.parentNode.parentNode.textContent = type;
                    });
    });
    d3.select(document.getElementById("Settings_1").lastElementChild).on("click", () => {
        // reuse the dropdown among all buttons for this setting
        document.getElementById("Settings_1").lastElementChild.appendChild(calcOptions.node());
        // toggle the dropdown list
        if (calcOptions.style("display") == "none") { 
            hideDropdowns();
            calcOptions.style("display", "block");
        }
        else
            hideDropdowns();
    });
}

d3.select("#startButton").on("click", () => {
    hideDropdowns();
    TurnManager.getInstance().resetLists();
    GameStateManager.getInstance().resetSimulation();
    // get input values and create target
    let targetStats = getTargetStats();
    let globalBuffs = getGlobalStats();
    let newTarget = new Target("6p62", targetStats[0], targetStats[2], 2, selectedPhases);
    GameStateManager.getInstance().registerTarget(newTarget);
    newTarget.finishCloning();
    //newTarget.disableBuffs();
    GameStateManager.getInstance().addCover(targetStats[1]);
    newTarget.setDefenseBuffs(targetStats[3]);
    newTarget.setDamageTaken(targetStats[4]);
    newTarget.setTargetedDamageTaken(targetStats[5]);
    newTarget.setAoEDamageTaken(targetStats[6]);
    newTarget.setStabilityDamageModifier(targetStats[7]);
    newTarget.applyDRPerStab(targetStats[8]);
    newTarget.applyDRWithStab(targetStats[9]);
    // apply global stat buffs
    GlobalBuffManager.getInstance().setGlobalAttack(globalBuffs[0]);
    GlobalBuffManager.getInstance().setGlobalDamage(globalBuffs[1]);
    GlobalBuffManager.getInstance().setGlobalAoEDamage(globalBuffs[2]);
    GlobalBuffManager.getInstance().setGlobalTargetedDamage(globalBuffs[3]);
    GlobalBuffManager.getInstance().setGlobalElementalDamage(Elements.FREEZE, globalBuffs[4]);

    let newDolls = createDollsFromInput();
    // set the calculation types for each doll
    for (let i = 0; i < numDolls; i++) {
        GameStateManager.getInstance().setDollCalcType(calcSettings[i], selectedDolls[i]);
    }

    GameStateManager.getInstance().startSimulation();
    startSimulation();
});

d3.select("#Doll_1").style("background-color", slotColors[0]);
var actingDoll = "";
var selectedSkill = "";
var skillOptions;
var currentBuffs;
// options for stat display/editing
var statOptions = ["Attack",
                    "Crit Rate",
                    "Crit Damage",
                    "Def Ignore",
                    "Damage Dealt",
                    "Targeted Damage",
                    "AoE Damage",
                    "Slowed Damage",
                    "Def Down Damage",
                    "Out of Turn Damage",
                    "Cover Ignore",
                    "Stability Damage",
                    "Stability Ignore",
                    "Attack Boost",
                    "Defense",
                    "Defense Boost",
                    "Phase Damage",
                    "Physical Damage",
                    "Freeze Damage",
                    "Burn Damage",
                    "Corrosion Damage",
                    "Hydro Damage",
                    "Electric Damage"];
var selectedStatIndex = [];
var statDropdown;
// after starting the simulation, change the layout of the page
function startSimulation() {
    // delete both of the first two columns' contents
    let col1 = d3.select("div").select("div");
    col1.selectAll("*").remove();
    let col2 = d3.select("#Dolls");
    col2.selectAll("*").remove();
    dollOptions = null;
    skillOptions = null;
    elementOptions = null;
    ammoOptions = null;
    fortOptions = null;
    if (skillOptions)
        skillOptions.style("display", "none");
    keyOptions = null;
    phaseDiv = [];
    // change the style so that the column height and layout is similar to the first column's
    col2.style("height", "");
    col2.style("white-space", "pre-line");
    col1.style("white-space", "normal");
    // rename the button, for now make it reload the page
    d3.select("#startButton").text("Perform Action").on("click", () => {location.reload()});
    // move the hidden ui to the middle column and reveal them
    document.getElementById("Dolls").appendChild(document.getElementById("CalcSettings"));
    document.getElementById("Dolls").appendChild(document.getElementById("Skill"));
    col2.selectAll("div").style("display", "block");
    d3.select("#CalcSettings").select("div").select("div").style("display", "none");
    document.getElementById("Dolls").appendChild(document.getElementById("ConditionalHolder"));
    d3.select("#ConditionalHolder").style("display", "block");
    initializeActionButtons();
    initializeDollCards();

}

function initializeActionButtons() {
    let actionDiv = document.getElementById("Skill").children;
    // doll button changes according to dolls with available turns
    d3.select(actionDiv[2]).on("click", () => {
        if (dollOptions) {
            dollOptions.remove();
            dollOptions = null;
        }
        else {
            dollOptions = d3.select(actionDiv[2]).append("div").attr("class", "dropdownBox").style("display", "none");
            let availableDolls = selectedDolls.filter(doll => {
                if (doll == "Papasha Summon")
                    return false;
                return true;
            });
            availableDolls.forEach(doll => {
                dollOptions.append("a")
                            .text(doll)
                            .on("click", () => {
                                actingDoll = doll;
                                actionDiv[1].textContent = "Doll: " + doll;
                                // activate the skill dropdown button
                                actionDiv[5].disabled = false;
                                // changing doll deselects the previously chosen skill
                                selectedSkill = "";
                                updateConditionalToggles();
                            });
            });
            
            if (dollOptions.style("display") == "none") {
                hideDropdowns();
                dollOptions.style("display", "block");
            }
            else
                hideDropdowns();
        }
    });
    // skill button changes depending on which doll skills are on cooldown or cannot be afforded, support and counter skills are not included and
    // their conditions to trigger must be met to use
    d3.select(actionDiv[5]).on("click", () => {
        if (skillOptions) {
            skillOptions.remove();
            skillOptions = null;
        }
        else {
            skillOptions = d3.select(actionDiv[5]).append("div").attr("class", "dropdownBox").style("display", "none");
            let dollData = GameStateManager.getInstance().getDoll(actingDoll);
            let cooldowns = dollData.getCooldowns();
            let skillData = dollData.getFinalSkillData();
            let availableSkills = [SkillNames.BASIC, SkillNames.SKILL2, SkillNames.SKILL3, SkillNames.ULT].filter((skill, index) => {
                // check if skill is on cooldown
                if (cooldowns[index] > 0)
                    return false;
                // check if skill cost is higher than current index
                if (skillData[skill].hasOwnProperty(SkillJSONKeys.COST)) {
                    if (skillData[skill][SkillJSONKeys.COST] > dollData.getCIndex())
                        return false;
                }
                return true;
            });
            availableSkills.forEach(skillName => {
                skillOptions.append("a")
                            .text(skillName)
                            .on("click", () => {
                                selectedSkill = skillName;
                                actionDiv[4].textContent = "Skill: " + skillName;
                                updateConditionalToggles();
                            });
            });
            
            if (skillOptions.style("display") == "none") {
                hideDropdowns();
                skillOptions.style("display", "block");
            }
            else
                hideDropdowns();
        }
    });
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
function updateConditionalToggles() {
    selectedDolls.forEach((doll, index) => {
        let skillConditionals = [];
        let conditionalDiv = document.getElementById("Conditional_" + (index + 1));
        // get all the conditionals of the doll skills
        if (selectedSkill != "") {
            if (doll == actingDoll) 
                skillConditionals = getSkillConditionals(selectedSkill, index);
            else if (ResourceLoader.getInstance().getSkillData(doll).hasOwnProperty(SkillNames.SUPPORT))
                skillConditionals = getSkillConditionals(SkillNames.SUPPORT, index);
        }
        if (skillConditionals.length > 0) {
            d3.select(conditionalDiv).style("display", "block");
            // write the name of the doll these conditionals belong to
            conditionalDiv.firstElementChild.textContent = doll;
            // adjust the number of toggles to match the number of conditionals
            while (skillConditionals.length > conditionalDiv.children.length / 3) {
                d3.select(conditionalDiv).append("br");
                d3.select(conditionalDiv).append("input").attr("type", "checkbox");
                d3.select(conditionalDiv).append("label");
            }
            if (skillConditionals.length < conditionalDiv.children.length / 3) 
                spliceNodeList(conditionalDiv.children, skillConditionals.length * 3, conditionalDiv.children.length - skillConditionals.length * 3);
            // apply each condition description to the toggle text
            skillConditionals.forEach((condition, conditionIndex) => {
                conditionalDiv.children[conditionIndex * 3 + 2].textContent = condition[SkillJSONKeys.CONDITION_TEXT] + " Condition Met";
            });
        }
        else {
            d3.select(conditionalDiv).style("display", "none");
            conditionalDiv.children[1].checked = false;
            // delete any excess toggles when disabled
            if (conditionalDiv.children.length > 3) 
                spliceNodeList(conditionalDiv.children, 3, conditionalDiv.children.length - 3);
        }
    });
}
// create cards that show a Doll's stats, index, and cooldowns
function initializeDollCards() {
    for (let i = 0; i < numDolls + numSummons; i++)
        selectedStatIndex.push(-1);
    let col1 = d3.select("div").select("div");
    for (let i = 0; i < numDolls + numSummons; i++) {
        let dollCard = col1.append("div");
        dollCard.attr("id", "Doll_" + (i + 1)).attr("class", "dollCard");
        // show doll name
        dollCard.append("h4").text(selectedDolls[i]);
        // create the remaining index display
        let doll = GameStateManager.getInstance().getDoll(selectedDolls[i]);
        dollCard.insert("div", "h4").style("float", "right").style("margin-right", "15px").style("margin-top", "10px").text(`Index ${doll.getCIndex()} / 6`);
        let cooldownText = "Cooldowns:";
        // internally negative cooldown is possible but to avoid confusion just show a lowerbound of 0
        for (let j = 0; j < 4; j++) {
            cooldownText += " " + Math.max(doll.getCooldowns()[j], 0);
        }
        dollCard.append("div").text(cooldownText);
        dollCard.style("background-color", slotColors[i]);
        // create button that can display current buffs and an add buff option
        dollCard.append("br");
        let buffDisplay = dollCard.append("button").style("float", "right").text("Show Current Buffs");
        buffDisplay.on("click", () => {
            if (currentBuffs) {
                hideDropdowns();
                buffDisplay.text("Show Current Buffs");
            }
            else {
                hideDropdowns();
                buffDisplay.text("Hide Current Buffs");
                currentBuffs = buffDisplay.append("div").attr("class", "dropdownBox");
                let buffs = doll.getBuffs();
                // selecting buffs does not do anything, just intended for display
                buffs.forEach(buff => {
                    currentBuffs.append("a").text(buff[0]);
                });
            }
        });
        // for adding or removing buffs
        dollCard.append("button").text("Select Buff");
        dollCard.append("br");
        dollCard.append("button").text("Add Buff");
        dollCard.append("br"); 
        dollCard.append("br");
        // doll stat display and editing
        dollCard.append("label").text("View/Edit Stats");
        dollCard.append("button").style("margin-left", "20px").text("Select Stat").on("click", event => {
            if (statDropdown.style("display") == "block")
                hideDropdowns();
            else {
                hideDropdowns();
                event.target.appendChild(document.getElementById("StatDropdown"));
                statDropdown.style("display", "block");
            }
        });
        dollCard.append("br");
        dollCard.append("input").attr("type", "text").attr("id", "StatEdit_" + (i + 1)).attr("disabled", "true");
        dollCard.append("button").text("Change Stat").style("float", "right").on("click", event => {
            let dollNum = +event.target.parentNode.id.slice(5) - 1;
            changeDollStat(dollNum);
        });
        dollCard.append("br");
        dollCard.append("label").text("Final Stat");
        dollCard.append("br");
        dollCard.append("input").attr("type", "text").attr("id", "StatTotal_" + (i + 1)).attr("disabled", "true");
        dollCard.append("button").text("Review Base").style("float", "right").on("click", event => {
            let dollNum = +event.target.parentNode.id.slice(5) - 1;
            refreshStatDisplay(dollNum);
        });
    }
    // create the stat dropdown that will be shared among all doll cards
    statDropdown = d3.select("div").append("div").attr("class", "dropdownBox").attr("id", "StatDropdown").style("display", "none");
    statOptions.forEach((stat, index) => {
        statDropdown.append("a")
                    .text(stat)
                    .on("click", event => {
                        let dollNum = +event.target.parentNode.parentNode.parentNode.id.slice(5) - 1;
                        updateStatDisplay(dollNum, index);
                    });
    });
}

function updateStatDisplay(dollIndex, statIndex) {
    let doll = GameStateManager.getInstance().getDoll(selectedDolls[dollIndex]);
    selectedStatIndex[dollIndex] = statIndex;
    // the base stat is editable, the final stat after all buffs is not
    let baseStat = 0;
    let finalStat = 0;
    switch(statIndex) {
        case 0:
            baseStat = doll.getBaseAttack();
            finalStat = doll.getAttack();
            break;
        case 1:
            baseStat = doll.getBaseCrit();
            finalStat = doll.getCritRate();
            break;
        case 2:
            baseStat = doll.getBaseCritDamage();
            finalStat = doll.getCritDamage();
            break;
        case 3:
            baseStat = doll.getBaseDefenseIgnore();
            finalStat = doll.getDefenseIgnore();
            break;
        case 4:
            baseStat = doll.getBaseDamageDealt();
            finalStat = doll.getDamageDealt();
            break;
        case 5:
            baseStat = doll.getBaseTargetedDamage();
            finalStat = doll.getTargetedDamage();
            break;
        case 6:
            baseStat = doll.getBaseAoEDamage();
            finalStat = doll.getAoEDamage();
            break;
        case 7:
            baseStat = doll.getBaseSlowedDamage();
            finalStat = doll.getSlowedDamage();
            break;
        case 8:
            baseStat = doll.getBaseDefDownDamage();
            finalStat = doll.getDefDownDamage();
            break;
        case 9:
            baseStat = doll.getBaseSupportDamage();
            finalStat = doll.getSupportDamage();
            break;
        case 10:
            baseStat = doll.getBaseCoverIgnore();
            finalStat = doll.getCoverIgnore();
            break;
        case 11:
            baseStat = doll.getBaseStabilityDamageModifier();
            finalStat = doll.getStabilityDamageModifier();
            break;
        case 12:
            baseStat = doll.getBaseStabilityIgnore();
            finalStat = doll.getStabilityIgnore();
            break;
        case 13:
            baseStat = doll.getBaseAttackBoost();
            finalStat = doll.getAttackBoost();
            break;
        case 14:
            baseStat = doll.getBaseDefense();
            finalStat = doll.getDefense();
            break;
        case 15:
            baseStat = doll.getBaseDefenseBuffs();
            finalStat = doll.getDefenseBuffs();
            break;
        case 16:
            baseStat = doll.getBasePhaseDamage();
            finalStat = doll.getPhaseDamage();
            break;
        case 17:
            baseStat = doll.getBaseElementDamage(Elements.PHYSICAL);
            finalStat = doll.getElementDamage(Elements.PHYSICAL);
            break;
        case 18:
            baseStat = doll.getBaseElementDamage(Elements.FREEZE);
            finalStat = doll.getElementDamage(Elements.FREEZE);
            break;
        case 19:
            baseStat = doll.getBaseElementDamage(Elements.BURN);
            finalStat = doll.getElementDamage(Elements.BURN);
            break;
        case 20:
            baseStat = doll.getBaseElementDamage(Elements.CORROSION);
            finalStat = doll.getElementDamage(Elements.CORROSION);
            break;
        case 21:
            baseStat = doll.getBaseElementDamage(Elements.HYDRO);
            finalStat = doll.getElementDamage(Elements.HYDRO);
            break;
        case 22:
            baseStat = doll.getBaseElementDamage(Elements.ELECTRIC);
            finalStat = doll.getElementDamage(Elements.ELECTRIC);
            break;
        default :
            console.error(`${statIndex} out of range of stat array`);
    }
    document.getElementById("StatEdit_" + (dollIndex + 1)).value = baseStat;
    // activate the text input for editing
    document.getElementById("StatEdit_" + (dollIndex + 1)).disabled = false;
    // display the total with buffs but before edits are made
    document.getElementById("StatTotal_" + (dollIndex + 1)).value = finalStat;
}

function refreshStatDisplay(dollIndex) {
    if (selectedStatIndex[dollIndex] != -1)
        updateStatDisplay(dollIndex, selectedStatIndex[dollIndex]);
}

function changeDollStat(dollIndex) {

}