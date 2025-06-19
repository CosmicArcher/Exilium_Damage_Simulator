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
import {Elements, AmmoTypes, CalculationTypes, SkillJSONKeys, SkillNames, WeaponJSONKeys, StatVariants} from "./Enums.js";
import StatTracker from "./StatTracker.js";
import ChartMaker from "./ChartMaker.js";

var selectedPhases = [];
var selectedDolls = [""];
var selectedFortifications = [0];
var selectedWeapons = ["Other Gun"];
var selectedCalibrations = [1];
var selectedKeys = [[0,0,0,0,0,0]];
var calcSettings = [CalculationTypes.EXPECTED];
var numDolls = 1;
// papasha summon does not count towards the limit of 4 supports
var numSummons = 0;

var dollOptions;
var keyOptions;
var phaseDiv = [null];
var fortOptions;
var weaponOptions;
var calibOptions;
// for use when dynamically adding and removing doll slots
var slotColors;
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
    newNode.children[12].innerHTML = "Weapon: C1 Other Gun";
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
    selectedWeapons.push("Other Gun");
    selectedCalibrations.push(1);
    selectedKeys.push([0,0,0,0,0,0]);
    document.getElementById("Dolls").appendChild(newNode);
    // deactivate the fortification, weapons and key buttons until doll is selected
    newNode.children[4].disabled = true;
    newNode.children[6].disabled = true;
    newNode.children[8].disabled = true;
    newNode.children[10].disabled = true;
    newNode.children[14].disabled = true;
    newNode.children[15].disabled = true;
    newNode.children[7].textContent = "None";
    newNode.children[9].textContent = "None";
    newNode.children[11].textContent = "None";
    // deselect the phase strike toggle if the first slot had it selected
    newNode.children[17].checked = false;
    // deactivate the start button until all doll slots have a selected doll
    document.getElementById("startButton").disabled = true;
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
    newSetting.firstElementChild.textContent = "Select Calculation Type";
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
    selectedWeapons.splice(index, 1);
    selectedCalibrations.splice(index, 1);
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
    d3.select("#Settings_" + (index + 1)).remove();
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
                                // enable the weapon dropdown buttons as well
                                dollStats[index == 0 ? 13 : 14].disabled = false;
                                dollStats[index == 0 ? 14 : 15].disabled = false;
                                // clear the displayed keys from the previous doll
                                dollStats[index == 0 ? 6 : 7].textContent = "None";
                                dollStats[index == 0 ? 8 : 9].textContent = "None";
                                dollStats[index == 0 ? 10 : 11].textContent = "None";
                                selectedKeys[dollIndex] = [0,0,0,0,0,0];
                                // selecting a doll in every slot re-enables the start button
                                let dollsSet = true;
                                for (let i = 0; i < numDolls && dollsSet; i++) {
                                    // if any of the doll slots still does not have a selected doll, exit the loop early
                                    if (selectedDolls[i] == "")
                                        dollsSet = false;
                                }
                                if (dollsSet)
                                    document.getElementById("startButton").disabled = false;
                            });
            });
        }
    });
    // if fortification button is clicked, show a list from V0-V6 to set the fortification of the doll
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
    // if weapon button is clicked, show a list of all weapons for now regardless of the doll's eligibility to equip the weapons
    d3.select(dollStats[index == 0 ? 13 : 14]).on("click", () => {
        // if dropdown list has not yet been created
        if (!weaponOptions) {
            weaponOptions = d3.select(dollStats[index == 0 ? 13 : 14]).append("div").attr("class", "dropdownBox").style("display", "none");
            let weapons = ResourceLoader.getInstance().getAllWeapons();
            weapons.forEach(weapon => {
                weaponOptions.append("a")
                            .text(weapon)
                            .on("click", (event) => {
                                let dollIndex = +event.target.parentNode.parentNode.parentNode.id.slice(5) - 1;
                                selectedWeapons[dollIndex] = weapon;
                                updateSelectedWeapon(dollIndex);
                            });
            });
        } // if dropdown has already been created, reuse it by transferring it as a child of a new weapon button
        else {
            dollStats[index == 0 ? 13 : 14].appendChild(weaponOptions.node());
        }
        // toggle the dropdown list
        if (weaponOptions.style("display") == "none") { 
            hideDropdowns();
            weaponOptions.style("display", "block");
        }
        else
            hideDropdowns();
    });
    // if weapon calibration button is clicked, show calibration levels 1-6
    d3.select(dollStats[index == 0 ? 14 : 15]).on("click", () => {
        // if dropdown list has not yet been created
        if (!calibOptions) {
            calibOptions = d3.select(dollStats[index == 0 ? 14 : 15]).append("div").attr("class", "dropdownBox").style("display", "none");
            for (let i = 1; i < 7; i++) {
                calibOptions.append("a")
                            .text("C" + i)
                            .on("click", (event) => {
                                let dollIndex = +event.target.parentNode.parentNode.parentNode.id.slice(5) - 1;
                                selectedCalibrations[dollIndex] = i;
                                updateSelectedWeapon(dollIndex);
                            });
            }
        } // if dropdown has already been created, reuse it by transferring it as a child of a new weapon button
        else {
            dollStats[index == 0 ? 14 : 15].appendChild(calibOptions.node());
        }
        // toggle the dropdown list
        if (calibOptions.style("display") == "none") { 
            hideDropdowns();
            calibOptions.style("display", "block");
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
            selectedFortifications[i], selectedKeys[i], selectedWeapons[i], selectedCalibrations[i],
            document.getElementById("Doll_" + (i + 1)).children[i == 0 ? 16 : 17].checked); // get the phase strike checkbox input
        //newDoll.disableBuffs();
        newDoll.finishCloning();
        newDoll.setDamageDealt(dollStats[4], StatVariants.ALL);
        newDoll.setDefenseIgnore(dollStats[3], StatVariants.ALL);
        newDoll.setDamageDealt(dollStats[5], StatVariants.TARGETED);
        newDoll.setDamageDealt(dollStats[6], StatVariants.AOE);
        newDoll.setSlowedDamage(dollStats[7]);
        newDoll.setDefDownDamage(dollStats[8]);
        newDoll.setSupportDamage(dollStats[9]);
        newDoll.setCoverIgnore(dollStats[10]);  
        newDoll.setStabilityDamageModifier(dollStats[11], StatVariants.ALL);
        newDoll.setStabilityIgnore(dollStats[12]);
        newDoll.setDamageDealt(dollStats[14], StatVariants.PHASE);
        newDoll.setDamageDealt(dollStats[15], StatVariants.PHYSICAL);
        newDoll.setDamageDealt(dollStats[16], StatVariants.FREEZE);
        newDoll.setDamageDealt(dollStats[17], StatVariants.BURN);
        newDoll.setDamageDealt(dollStats[18], StatVariants.CORROSION);
        newDoll.setDamageDealt(dollStats[19], StatVariants.HYDRO);
        newDoll.setDamageDealt(dollStats[20], StatVariants.ELECTRIC);
        // check if the weapon applies a global buff
        let weaponData = ResourceLoader.getInstance().getWeaponData(selectedWeapons[i]);
        if (weaponData.hasOwnProperty(WeaponJSONKeys.GLOBAL)) {
            // assemble global buff name using weapon name and calib
            let weaponBuff = weaponData[WeaponJSONKeys.GLOBAL][WeaponJSONKeys.BUFF_NAME] + " C" + selectedCalibrations[i];
            GlobalBuffManager.getInstance().addGlobalWeaponBuff([weaponBuff, selectedDolls[i]]);
        }
        dolls.push(newDoll);
        // papasha summon inherits the same atk, def, hp but not damage buffs or crit
        if (selectedDolls[i] == "Papasha") {
            let newDoll = DollFactory.getInstance().createDoll("Papasha Summon", dollStats[13], dollStats[0], dollStats[1], dollStats[2], 
                selectedFortifications[i], selectedKeys[i], "Other Gun", 1, false);
            // check if papasha has svarog for the extra targeted damage buff on her summon
            if (selectedWeapons[i] == "Svarog")
                newDoll.setTargetedDamage(0.12 + 0.03 * selectedCalibrations[i]);
            newDoll.finishCloning();
            dolls.push(newDoll);
            numSummons++;
            selectedDolls.push("Papasha Summon");
            selectedFortifications.push(selectedFortifications[i]);
            selectedKeys.push(selectedKeys[i]);

            addCalcOption();
            addConditionalToggle();
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
    if (weaponOptions)
        weaponOptions.style("display", "none");
    if (calibOptions)
        calibOptions.style("display", "none");
    if (calcOptions)
        calcOptions.style("display", "none");
    // just delete the current buff display if it exists since the list always changes
    if (currentBuffs) {
        currentBuffs.remove();
        currentBuffs = null;
    }
    if (statDropdown)
        statDropdown.style("display", "none");
    if (allBuffDropdown)
        allBuffDropdown.style("display", "none");
    if (targetStatDropdown)
        targetStatDropdown.style("display", "none");
    if (dollCardDropdown)
        dollCardDropdown.style("display", "none");
    if (buffTargetDropdown)
        buffTargetDropdown.style("display", "none");
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
        let conditionalDiv = document.getElementById("Conditional_" + (i + 1));
        overrides.push([]);
        for (let j = 0; j < conditionalDiv.children.length / 3; j++) {
            overrides[i].push(conditionalDiv.children[j*3 + 1].checked);
        }
    }
    return overrides;
}
// get the key data of doll at index
function getDollKeys(index) {
    return ResourceLoader.getInstance().getKeyData(selectedDolls[index]);
}

function updateSelectedDoll(index) {
    document.getElementById("Doll_" + (index + 1)).children[index == 0 ? 1 : 2].textContent = "Doll: V" + selectedFortifications[index] + " " + selectedDolls[index];
    document.getElementById("Settings_" + (index + 1)).firstChild.textContent = selectedDolls[index];
}

function updateSelectedWeapon(index) {
    document.getElementById("Doll_" + (index + 1)).children[index == 0 ? 12 : 13]
        .textContent = `Weapon: C${selectedCalibrations[index]} ${selectedWeapons[index] == "" ? "Other Gun" : selectedWeapons[index]}`;
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
ResourceLoader.getInstance().loadWeaponJSON();
EventManager.getInstance();
TurnManager.getInstance();
ActionLog.getInstance();
DollFactory.getInstance();
GlobalBuffManager.getInstance();
StatTracker.getInstance();
ChartMaker.getInstance();
slotColors = ChartMaker.getDollColors();
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
    let newTarget = new Target("6p62", targetStats[0], targetStats[2], targetStats[3], selectedPhases);
    GameStateManager.getInstance().registerTarget(newTarget);
    newTarget.finishCloning();
    //newTarget.disableBuffs();
    GameStateManager.getInstance().addCover(targetStats[1]);
    newTarget.setDefenseBuffs(targetStats[4]);
    newTarget.setDamageTaken(targetStats[5], StatVariants.ALL);
    newTarget.setDamageTaken(targetStats[6], StatVariants.TARGETED);
    newTarget.setDamageTaken(targetStats[7], StatVariants.AOE);
    newTarget.setStabilityTakenModifier(targetStats[8], StatVariants.ALL);
    newTarget.applyDRPerStab(targetStats[9]);
    newTarget.applyDRWithStab(targetStats[10]);
    newTarget.setIsLarge(document.getElementById("largeToggle").checked);
    newTarget.setIsBoss(document.getElementById("bossToggle").checked);
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
var calcOptions;
var currentBuffs;
var selectedBuff = "";
var selectedBuffTarget = "";
var buffTargetDropdown;
var dollCardDropdown;
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

var allBuffDropdown;
// for the target card
var targetStatOptions = ["Defense",
                        "Current Stability",
                        "Defense Buffs",
                        "Damage Taken",
                        "AoE Damage Taken",
                        "Targeted Damage Taken",
                        "Stability Damage Taken",
                        "Damage Reduction/Stability",
                        "Damage Reduction w/ Stability"];
var targetStatDropdown;
var targetStatIndex = -1;
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
    // show current turn and total damage
    d3.select("#SimControls").selectAll("div").style("display", "block");
    // rename the button and disable it, change the onclick function to add the doll into the turn manager
    d3.select("#startButton").text("Perform Action")
                            .on("click", () => {
                                let conditionalOverrides = getConditionalOverrides();
                                // get the index of the acting doll
                                let actingIndex = 0;
                                selectedDolls.forEach((doll, index) => {
                                    if (doll == actingDoll)
                                        actingIndex = index;
                                });
                                // tbh there is no support that has a conditional to my knowledge
                                // check if the skill is an attack or buffing skill
                                if (selectedBuffTarget == "")
                                    TurnManager.getInstance().useDollSkill(actingDoll, selectedSkill, conditionalOverrides[actingIndex]);
                                else 
                                    TurnManager.getInstance().useBuffSkill(actingDoll, selectedBuffTarget, selectedSkill, conditionalOverrides[actingIndex]);
                                // refresh doll stat displays
                                for (let i = 0; i < numDolls + numSummons; i++) {
                                    refreshDollDisplay(i);
                                    refreshStatDisplay(i);
                                }
                                refreshTargetDisplay();
                                refreshTurnText();
                                // disable start and skill buttons again until new doll and skill are chosen
                                document.getElementById("startButton").disabled = true;
                                selectedSkill = "";
                                let actionDiv = document.getElementById("Skill").children;
                                actionDiv[5].disabled = true;
                                actionDiv[1].textContent = "Doll: ";
                                actionDiv[4].textContent = "Skill: ";
                                // hide the conditional toggles since the skill has been used
                                updateConditionalToggles();
                                d3.select(actionDiv[7]).style("display", "none");
                                d3.select(actionDiv[8]).style("display", "none");
                                // clear the selections while hiding it
                                selectedBuffTarget = "";
                                actionDiv[7].textContent = "Target:";
                                // allow the rewind button to be pressed because there is now an action that we can rewind
                                document.getElementById("rewindButton").disabled = false;
                            });
    document.getElementById("startButton").disabled = true;
    // initialize rewind, enemy attack, and end round buttons
    d3.select("#rewindButton").on("click", event => {
        // undo the previous action
        GameStateManager.getInstance().rewindToAction(GameStateManager.getInstance().getActionCount() - 1);
        // disable start and skill buttons again until new doll and skill are chosen
        document.getElementById("startButton").disabled = true;
        selectedSkill = "";
        document.getElementById("Skill").children[5].disabled = true;
        document.getElementById("Skill").children[1].textContent = "Doll: ";
        document.getElementById("Skill").children[4].textContent = "Skill: ";
        // hide the conditional toggles since the skill has been used
        updateConditionalToggles();
        // refresh doll stat displays
        for (let i = 0; i < numDolls + numSummons; i++) {
            refreshDollDisplay(i);
            refreshStatDisplay(i);
        }
        refreshTargetDisplay();
        refreshTurnText();
        // if there are no more actions to rewind, disable the button
        if (GameStateManager.getInstance().getActionCount() == 0)
            event.target.disabled = true;
    });
    d3.select("#enemyAttack").on("click", event => {
        EventManager.getInstance().broadcastEvent("enemyAttack", null);
        // temporarily disable button to prevent spam clicking
        event.target.disabled = true;
        let timer = d3.timer((elapsed) => {
            if (elapsed > 150) { 
                event.target.disabled = false;
                timer.stop();
            }
        });
        for (let i = 0; i < numDolls + numSummons; i++) {
            refreshDollDisplay(i);
            refreshStatDisplay(i);
        }
        refreshTargetDisplay();
        refreshTurnText();
    });
    d3.select("#startRound").on("click", event => {
        GameStateManager.getInstance().endRound();
        // temporarily disable button to prevent spam clicking
        event.target.disabled = true;
        let timer = d3.timer((elapsed) => {
            if (elapsed > 150) { 
                event.target.disabled = false;
                timer.stop();
            }
        });
        for (let i = 0; i < numDolls + numSummons; i++) {
            refreshDollDisplay(i);
            refreshStatDisplay(i);
        }
        refreshTargetDisplay();
        refreshTurnText();
    });
    document.getElementById("enemyAttack").disabled = false;
    document.getElementById("startRound").disabled = false;
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
            // filter out dolls that are either summons or have already used their turn
            let availableDolls = selectedDolls.filter(doll => {
                if (doll == "Papasha Summon")
                    return false;
                if (!GameStateManager.getInstance().getDoll(doll).hasTurnAvailable())
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
                                // disable the perform action button
                                document.getElementById("startButton").disabled = true;
                                // changing doll deselects the previously chosen skill
                                selectedSkill = "";
                                actionDiv[4].textContent = "Skill: ";
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
                                checkSkillType();
                            });
            });
            
            if (skillOptions.style("display") == "none") {
                hideDropdowns();
                skillOptions.style("display", "block");
            }
            else
                hideDropdowns();
            // also remove the doll dropdown if it is active
            if (dollOptions) {
                dollOptions.remove();
                dollOptions = null;
            }
        }
    });

    // show a list of all dolls that will be used for selecting buff targets
    buffTargetDropdown = d3.select(actionDiv[8]).append("div").attr("class", "dropdownBox").style("display", "none");
    selectedDolls.forEach(doll => {
        buffTargetDropdown.append("a")
                    .text(doll)
                    .on("click", () => {
                        selectedBuffTarget = doll;
                        actionDiv[7].textContent = "Target: " + doll; 
                        // activate the perform action button now that a buff target has been selected
                        document.getElementById("startButton").disabled = false;
                    });
    });
    d3.select(actionDiv[8]).on("click", () => {
        if (buffTargetDropdown.style("display") == "none") {
            hideDropdowns();
            buffTargetDropdown.style("display", "block");
        }
        else
            hideDropdowns();
    });
}

function getSkillConditionals(skillName, index) {
    let conditionals = [];
    let doll = GameStateManager.getInstance().getDoll(selectedDolls[index]);
    let skillData = doll.getFinalSkillData();
    if (skillData[skillName].hasOwnProperty(SkillJSONKeys.CONDITIONAL)) {
        skillData[skillName][SkillJSONKeys.CONDITIONAL].forEach(condition => {
            conditionals.push(condition);
        });
    }
    /*// get the doll's inherent skill conditionals
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
    }*/
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
            conditionalDiv.firstElementChild.textContent = doll + " " + doll == actingDoll ? selectedSkill : "Support";
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
// check if the selected skill is an attack or buffing skill and display/hide the buff target selection
function checkSkillType() {
    let actionDiv = document.getElementById("Skill").children;
    let doll = GameStateManager.getInstance().getDoll(actingDoll);
    let skillData = doll.getFinalSkillData()[selectedSkill];
    if (skillData[SkillJSONKeys.TYPE] == "Buff") {
        // check the target of the buffing skill, self, all, or ally, only ally allows target selection, the other 2 automatically target self
        d3.select(actionDiv[7]).style("display", "initial");
        if (skillData[SkillJSONKeys.BUFF_TARGET] == "Ally") {
            d3.select(actionDiv[8]).style("display", "initial");
            // deactivate the perform action button while a buff target has not yet been selected
            document.getElementById("startButton").disabled = true;
        }
        else {
            d3.select(actionDiv[8]).style("display", "none");
            // automatically set selected buff target as self
            selectedBuffTarget = actingDoll;
            actionDiv[7].textContent = "Target: " + actingDoll;
            // since there is no need to select a target, activate the perform action button
            document.getElementById("startButton").disabled = false;
        }
    }
    else {
        d3.select(actionDiv[7]).style("display", "none");
        d3.select(actionDiv[8]).style("display", "none");
        // clear the selections while hiding it
        selectedBuffTarget = "";
        actionDiv[7].textContent = "Target:";
        // activate the perform action button if not a buffing skill
        document.getElementById("startButton").disabled = false;
    }
}
// create cards that show a Doll's stats, index, and cooldowns
function initializeDollCards() {
    for (let i = 0; i < numDolls + numSummons; i++)
        selectedStatIndex.push(-1);
    let col1 = d3.select("div").select("div");
    // create a card for the target as well
    {
        let targetCard = col1.append("div");
        targetCard.attr("id", "Doll_0").attr("class", "dollCard");
        let target = GameStateManager.getInstance().getTarget();        
        // show target name
        targetCard.append("h4").text(target.getName());
        // display total damage on upper right
        targetCard.insert("div", "h4").style("float", "right")
                                    .style("margin-right", "15px")
                                    .style("margin-top", "10px")
                                    .attr("id", "TargetStability")
                .text(`Stability: ${target.getStability()} / ${target.getMaxStability()} (${target.getBrokenTurns()} / ${target.getTurnsToRecover()} Turns)`);
        // display phase weaknesses
        let weaknessText = "Weaknesses:";
        let weaknesses = target.getPhaseWeaknesses();
        for (let i = 0; i < weaknesses.length; i++) {
            weaknessText += " " + weaknesses[i];
        }
        targetCard.append("div").style("margin-bottom", "-10px")
                            .style("margin-top", "-10px")
                            .attr("id", "Weaknesses")
                            .text(weaknessText);
        targetCard.style("background-color", "darkgoldenrod");
        // create button that can display current buffs and an add buff option
        {
        targetCard.append("br");
        let targetBuffDisplay = targetCard.append("button").style("float", "right").text("Show Current Buffs");
        targetBuffDisplay.on("click", () => {
            if (currentBuffs) {
                hideDropdowns();
                targetBuffDisplay.text("Show Current Buffs");
            }
            else {
                hideDropdowns();
                targetBuffDisplay.text("Hide Current Buffs");
                // we can share the dropdown with the dolls because it gets deleted repeatedly so the onclick function constantly changes
                currentBuffs = targetBuffDisplay.append("div").attr("class", "dropdownBox");
                // refresh target reference
                target = GameStateManager.getInstance().getTarget();
                let buffs = target.getBuffs();
                // selecting buffs allows the user to remove it from the unit
                buffs.forEach(buff => {
                    currentBuffs.append("a")
                                // display stacks, buffname, duration left
                                .text(`${buff[3] != 1 ? buff[3] + " " : ""}${buff[0]} - ${buff[2] > 0 ? buff[2] : "Indefinite"} Turns`)
                                .on("click", () => {
                                    // only allow the remove button to be clicked and disable all the other buff edit buttons on other doll cards 
                                    disableBuffEditButtons();
                                    document.getElementById("RemoveBuff_0").disabled = false;
                                    selectedBuff = buff[0];
                                    d3.select("#SelectedBuff_0").text("Selected Buff: " + buff[0]);
                                });
                });
            }
        });
        // for adding or removing buffs
        targetCard.append("button").text("Select Buff")
                                .on("click", event => {
                                    if (allBuffDropdown.style("display") == "block") {
                                        hideDropdowns();
                                    }
                                    else {
                                        hideDropdowns();
                                        event.target.appendChild(document.getElementById("AllBuffDropdown"));
                                        allBuffDropdown.style("display", "block");
                                    }
                                });
        targetCard.append("div").attr("id", "SelectedBuff_0")
                            .style("padding-top", "10px")
                            .style("margin-bottom", "-10px")
                            .text("Selected Buff: ");
        targetCard.append("br");
        targetCard.append("button").text("Add Buff")
                                .attr("id", "AddBuff_0")
                                .attr("disabled", "true")
                                .on("click", event => {
                                    // only add 1 stack and 1 turn of the buff
                                    target = GameStateManager.getInstance().getTarget();
                                    target.addBuff(selectedBuff, target.getName(), 1, 1);
                                    // after removing the buff, disable the button until another buff is selected
                                    event.target.disabled = true;
                                    d3.select("#SelectedBuff_0").text("Selected Buff: ");
                                });
        targetCard.append("button").text("Remove Buff")
                                .attr("id", "RemoveBuff_0")
                                .style("float", "right")
                                .attr("disabled", "true")
                                .on("click", event => {
                                    target = GameStateManager.getInstance().getTarget();
                                    target.removeBuff(selectedBuff);
                                    // after removing the buff, disable the button until another buff is selected
                                    event.target.disabled = true;
                                    d3.select("#SelectedBuff_0").text("Selected Buff: ");
                                });
        targetCard.append("br");
        targetCard.append("br");
        }
        // target stat display and editing
        {
        targetCard.append("label").text("View/Edit Stats");
        targetCard.append("br");
        targetCard.append("button").text("Select Stat").on("click", event => {
            if (targetStatDropdown.style("display") == "block")
                hideDropdowns();
            else {
                hideDropdowns();
                event.target.appendChild(document.getElementById("TargetStatDropdown"));
                targetStatDropdown.style("display", "block");
            }
        });
        targetCard.append("label").style("margin-left", "10px")
                                .attr("id", "Stat_0");
        targetCard.append("button").text("Refresh View")
                                .attr("id", "StatRefresh_0")
                                .attr("disabled", "true")
                                .style("float", "right")
                                .on("click", () => {
                                    refreshTargetDisplay();
                                });
        targetCard.append("label").text("Final Stat")
                                .style("float", "right")
                                .style("margin-right", "10px");
        targetCard.append("br");
        targetCard.append("input").attr("type", "text")
                                .attr("id", "StatEdit_0")
                                .attr("disabled", "true");
        targetCard.append("input").attr("type", "text")
                                .attr("id", "StatTotal_0")
                                .style("float", "right")
                                .attr("disabled", "true");
        targetCard.append("br");
        targetCard.append("button").text("Change Stat")
                                .attr("id", "StatChange_0")
                                .attr("disabled", "true")
                                .on("click", () => {
                                    changeTargetStat();
                                    refreshTargetDisplay();
                                });
        }        
    }

    for (let i = 0; i < numDolls + numSummons; i++) {
        let dollCard = col1.append("div");
        dollCard.attr("id", "Doll_" + (i + 1)).attr("class", "dollCard").style("display", "none");
        // show doll name that can be tabbed between all dolls for a more compact ui
        dollCard.append("button")
                .style("margin-top", "10px")
                .text(selectedDolls[i])
                .on("click", event => {
                    if (dollCardDropdown.style("display") == "block")
                        hideDropdowns();
                    else {
                        hideDropdowns();
                        event.target.appendChild(document.getElementById("DollCardDropdown"));
                        dollCardDropdown.style("display", "block");
                    }
                });
        // create the remaining index display
        let doll = GameStateManager.getInstance().getDoll(selectedDolls[i]);
        dollCard.insert("div", "h4").style("float", "right")
                                    .style("margin-right", "15px")
                                    .style("margin-top", "10px")
                                    .attr("id", "CIndex_" + (i + 1))
                                    .text(`Index ${doll.getCIndex()} / 6`);
        dollCard.append("br");
        let cooldownText = "Cooldowns:";
        // internally negative cooldown is possible but to avoid confusion just show a lowerbound of 0
        for (let j = 0; j < 4; j++) {
            cooldownText += " " + Math.max(doll.getCooldowns()[j], 0);
        }
        dollCard.append("div").style("margin-bottom", "-10px")
                            
                            .attr("id", "Cooldowns_" + (i + 1))
                            .text(cooldownText);
        dollCard.style("background-color", slotColors[i]);
        // create button that can display current buffs and an add buff option
        {
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
                // refresh doll reference to get latest version of the doll
                doll = GameStateManager.getInstance().getDoll(selectedDolls[i]);
                let buffs = doll.getBuffs();
                // selecting buffs allows the user to remove it from the unit
                buffs.forEach(buff => {
                    currentBuffs.append("a")
                                // display stacks, buffname, duration left
                                .text(`${buff[3] != 1 ? buff[3] + " " : ""}${buff[0]} - ${buff[2] > 0 ? buff[2] : "Indefinite"} Turns`)
                                .on("click", event => {
                                    let dollNum = +event.target.parentNode.parentNode.parentNode.id.slice(5);
                                    // only allow the remove button to be clicked and disable all the other buff edit buttons on other doll cards 
                                    disableBuffEditButtons();
                                    document.getElementById("RemoveBuff_" + dollNum).disabled = false;
                                    selectedBuff = buff[0];
                                    d3.select("#SelectedBuff_" + dollNum).text("Selected Buff: " + buff[0]);
                                });
                });
            }
        });
        // for adding or removing buffs
        dollCard.append("button").text("Select Buff")
                                .on("click", event => {
                                    if (allBuffDropdown.style("display") == "block") {
                                        hideDropdowns();
                                    }
                                    else {
                                        hideDropdowns();
                                        event.target.appendChild(document.getElementById("AllBuffDropdown"));
                                        allBuffDropdown.style("display", "block");
                                    }
                                });
        dollCard.append("div").attr("id", "SelectedBuff_" + (i + 1))
                            .style("padding-top", "10px")
                            .style("margin-bottom", "-10px")
                            .text("Selected Buff: ");
        dollCard.append("br");
        dollCard.append("button").text("Add Buff")
                                .attr("id", "AddBuff_" + (i + 1))
                                .attr("disabled", "true")
                                .on("click", event => {
                                    let dollNum = +event.target.parentNode.id.slice(5) - 1;
                                    let doll = GameStateManager.getInstance().getDoll(selectedDolls[dollNum]);
                                    // only add 1 stack and 1 turn of the buff
                                    doll.addBuff(selectedBuff, selectedDolls[dollNum], 1, 1);
                                    // after removing the buff, disable the button until another buff is selected
                                    event.target.disabled = true;
                                    d3.select("#SelectedBuff_" + (dollNum + 1)).text("Selected Buff: ");
                                });
        dollCard.append("button").text("Remove Buff")
                                .attr("id", "RemoveBuff_" + (i + 1))
                                .style("float", "right")
                                .attr("disabled", "true")
                                .on("click", event => {
                                    let dollNum = +event.target.parentNode.id.slice(5) - 1;
                                    let doll = GameStateManager.getInstance().getDoll(selectedDolls[dollNum]);
                                    doll.removeBuff(selectedBuff);
                                    // after removing the buff, disable the button until another buff is selected
                                    event.target.disabled = true;
                                    d3.select("#SelectedBuff_" + (dollNum + 1)).text("Selected Buff: ");
                                });
        dollCard.append("br");
        dollCard.append("br");
        }
        // doll stat display and editing
        {
        dollCard.append("label").text("View/Edit Stats");
        dollCard.append("br");
        dollCard.append("button").text("Select Stat").on("click", event => {
            if (statDropdown.style("display") == "block")
                hideDropdowns();
            else {
                hideDropdowns();
                event.target.appendChild(document.getElementById("StatDropdown"));
                statDropdown.style("display", "block");
            }
        });
        dollCard.append("label").style("margin-left", "10px")
                                .attr("id", "Stat_" + (i + 1));
        dollCard.append("button").text("Refresh View")
                                .attr("id", "StatRefresh_" + (i + 1))
                                .attr("disabled", "true")
                                .style("float", "right")
                                .on("click", event => {
            let dollNum = +event.target.parentNode.id.slice(5) - 1;
            refreshStatDisplay(dollNum);
        });
        dollCard.append("label").text("Final Stat")
                                .style("float", "right")
                                .style("margin-right", "10px");
        dollCard.append("br");
        dollCard.append("input").attr("type", "text")
                                .attr("id", "StatEdit_" + (i + 1))
                                .attr("disabled", "true");
        dollCard.append("input").attr("type", "text")
                                .attr("id", "StatTotal_" + (i + 1))
                                .style("float", "right")
                                .attr("disabled", "true");
        dollCard.append("br");
        dollCard.append("button").text("Change Stat")
                                .attr("id", "StatChange_" + (i + 1))
                                .attr("disabled", "true")
                                .on("click", event => {
            let dollNum = +event.target.parentNode.id.slice(5) - 1;
            changeDollStat(dollNum);
            refreshStatDisplay(dollNum);
        });
        }        
    }
    changeDollCard(0);
    // create the stat dropdown that will be shared among all doll cards
    statDropdown = d3.select("div").append("div").attr("class", "dropdownBox").attr("id", "StatDropdown").style("display", "none");
    statOptions.forEach((stat, index) => {
        statDropdown.append("a")
                    .text(stat)
                    .on("click", event => {
                        let dollNum = +event.target.parentNode.parentNode.parentNode.id.slice(5) - 1;
                        updateStatDisplay(dollNum, index);
                        document.getElementById("StatRefresh_" + (dollNum + 1)).disabled = false;
                        document.getElementById("StatChange_" + (dollNum + 1)).disabled = false;
                    });
    });
    let allBuffs = ResourceLoader.getInstance().getAllBuffs();
    // create buff dropdown for adding buffs that will be shared among all unit cards
    allBuffDropdown = d3.select("div").append("div").attr("class", "dropdownBox").attr("id", "AllBuffDropdown").style("display", "none");
    allBuffs.forEach(buffNames => {
        allBuffDropdown.append("a")
                        .text(buffNames)
                        .on("click", event => {
                            let dollNum = +event.target.parentNode.parentNode.parentNode.id.slice(5);
                            disableBuffEditButtons();
                            // activate the add buff button of the card the dropdown was clicked in
                            document.getElementById("AddBuff_" + dollNum).disabled = false;
                            selectedBuff = buffNames;
                            d3.select("#SelectedBuff_" + dollNum).text("Selected Buff: " + buffNames);
                        });
    });
    // create the stat dropdown that can allow editing of target stats
    targetStatDropdown = d3.select("div").append("div").attr("class", "dropdownBox").attr("id", "TargetStatDropdown").style("display", "none");
    targetStatOptions.forEach((stat, index) => {
        targetStatDropdown.append("a")
                    .text(stat)
                    .on("click", () => {
                        updateTargetStatDisplay(index);
                        document.getElementById("StatRefresh_0").disabled = false;
                        document.getElementById("StatChange_0").disabled = false;
                    });
    });
    // create the doll dropdown to swap between doll cards for a more compact ui
    dollCardDropdown = d3.select("div").append("div").attr("class", "dropdownBox").attr("id", "DollCardDropdown").style("display", "none");
    selectedDolls.forEach((dollName, index) => {
        dollCardDropdown.append("a")
                        .text(dollName)
                        .on("click", () => {
                            changeDollCard(index);
                        });
    });
}
// to swap between different doll cards, hide all except the selected doll
function changeDollCard(dollIndex) {
    for (let i = 1; i < numDolls + numSummons + 1; i++) {
        d3.select("#Doll_" + i).style("display", "none");
    }
    d3.select("#Doll_" + (dollIndex + 1)).style("display", "block");
}

function updateStatDisplay(dollIndex, statIndex) {
    let doll = GameStateManager.getInstance().getDoll(selectedDolls[dollIndex]);
    selectedStatIndex[dollIndex] = statIndex;
    // the base stat is editable, the final stat after all buffs is not
    let baseStat = 0;
    let finalStat = 0;
    let statName;
    switch(statIndex) {
        case 0:
            baseStat = doll.getBaseAttack();
            finalStat = doll.getAttack();
            statName = "Attack";
            break;
        case 1:
            baseStat = doll.getBaseCrit(StatVariants.ALL);
            finalStat = doll.getCritRate(StatVariants.ALL);
            statName = "Crit Rate";
            break;
        case 2:
            baseStat = doll.getBaseCritDamage(StatVariants.ALL);
            finalStat = doll.getCritDamage(StatVariants.ALL);
            statName = "Crit Damage";
            break;
        case 3:
            baseStat = doll.getBaseDefenseIgnore(StatVariants.ALL);
            finalStat = doll.getDefenseIgnore(StatVariants.ALL);
            statName = "Defense Ignore";
            break;
        case 4:
            baseStat = doll.getBaseDamageDealt(StatVariants.ALL);
            finalStat = doll.getDamageDealt(StatVariants.ALL);
            statName = "Damage Dealt";
            break;
        case 5:
            baseStat = doll.getBaseDamageDealt(StatVariants.TARGETED);
            finalStat = doll.getDamageDealt(StatVariants.TARGETED);
            statName = "Targeted Damage";
            break;
        case 6:
            baseStat = doll.getBaseDamageDealt(StatVariants.AOE);
            finalStat = doll.getDamageDealt(StatVariants.AOE);
            statName = "AoE Damage";
            break;
        case 7:
            baseStat = doll.getBaseSlowedDamage();
            finalStat = doll.getSlowedDamage();
            statName = "Slowed Damage";
            break;
        case 8:
            baseStat = doll.getBaseDefDownDamage();
            finalStat = doll.getDefDownDamage();
            statName = "Def Down Damage";
            break;
        case 9:
            baseStat = doll.getBaseSupportDamage();
            finalStat = doll.getSupportDamage();
            statName = "Out of Turn Damage";
            break;
        case 10:
            baseStat = doll.getBaseCoverIgnore();
            finalStat = doll.getCoverIgnore();
            statName = "Cover Ignore";
            break;
        case 11:
            baseStat = doll.getBaseStabilityDamageModifier(StatVariants.ALL);
            finalStat = doll.getStabilityDamageModifier(StatVariants.ALL);
            statName = "Stability Damage";
            break;
        case 12:
            baseStat = doll.getBaseStabilityIgnore();
            finalStat = doll.getStabilityIgnore();
            statName = "Stability Ignore";
            break;
        case 13:
            baseStat = doll.getBaseAttackBoost();
            finalStat = doll.getAttackBoost();
            statName = "Attack Boost";
            break;
        case 14:
            baseStat = doll.getBaseDefense();
            finalStat = doll.getDefense();
            statName = "Defense";
            break;
        case 15:
            baseStat = doll.getBaseDefenseBuffs();
            finalStat = doll.getDefenseBuffs();
            statName = "Defense Boost";
            break;
        case 16:
            baseStat = doll.getBaseDamageDealt(StatVariants.PHASE);
            finalStat = doll.getDamageDealt(StatVariants.PHASE);
            statName = "Phase Damage";
            break;
        case 17:
            baseStat = doll.getBaseDamageDealt(StatVariants.PHYSICAL);
            finalStat = doll.getDamageDealt(StatVariants.PHYSICAL);
            statName = "Physical Damage";
            break;
        case 18:
            baseStat = doll.getBaseDamageDealt(StatVariants.FREEZE);
            finalStat = doll.getDamageDealt(StatVariants.FREEZE);
            statName = "Freeze Damage";
            break;
        case 19:
            baseStat = doll.getBaseDamageDealt(StatVariants.BURN);
            finalStat = doll.getDamageDealt(StatVariants.BURN);
            statName = "Burn Damage";
            break;
        case 20:
            baseStat = doll.getBaseDamageDealt(StatVariants.CORROSION);
            finalStat = doll.getDamageDealt(StatVariants.CORROSION);
            statName = "Corrosion Damage";
            break;
        case 21:
            baseStat = doll.getBaseDamageDealt(StatVariants.HYDRO);
            finalStat = doll.getDamageDealt(StatVariants.HYDRO);
            statName = "Hydro Damage";
            break;
        case 22:
            baseStat = doll.getBaseDamageDealt(StatVariants.ELECTRIC);
            finalStat = doll.getDamageDealt(StatVariants.ELECTRIC);
            statName = "Electric Damage";
            break;
        default :
            console.error(`${statIndex} out of range of stat array`);
    }
    document.getElementById("StatEdit_" + (dollIndex + 1)).value = baseStat;
    // activate the text input for editing
    document.getElementById("StatEdit_" + (dollIndex + 1)).disabled = false;
    // display the total with buffs but before edits are made
    document.getElementById("StatTotal_" + (dollIndex + 1)).value = finalStat;
    // show which stat was selected as a reminder
    document.getElementById("Stat_" + (dollIndex + 1)).textContent = statName;
}

function refreshStatDisplay(dollIndex) {
    if (selectedStatIndex[dollIndex] != -1)
        updateStatDisplay(dollIndex, selectedStatIndex[dollIndex]);
}

function changeDollStat(dollIndex) {
    let doll = GameStateManager.getInstance().getDoll(selectedDolls[dollIndex]);
    let newStat = document.getElementById("StatEdit_" + (dollIndex + 1)).value;
    switch(selectedStatIndex[dollIndex]) {
        case 0:
            doll.setAttack(newStat);
            break;
        case 1:
            doll.setCritRate(newStat, StatVariants.ALL);
            break;
        case 2:
            doll.setCritDamage(newStat, StatVariants.ALL);
            break;
        case 3:
            doll.setDefenseIgnore(newStat, StatVariants.ALL);
            break;
        case 4:
            doll.setDamageDealt(newStat, StatVariants.ALL);
            break;
        case 5:
            doll.setDamageDealt(newStat, StatVariants.TARGETED);
            break;
        case 6:
            doll.setDamageDealt(newStat, StatVariants.AOE);
            break;
        case 7:
            doll.setSlowedDamage(newStat);
            break;
        case 8:
            doll.setDefDownDamage(newStat);
            break;
        case 9:
            doll.setSupportDamage(newStat);
            break;
        case 10:
            doll.setCoverIgnore(newStat);
            break;
        case 11:
            doll.setStabilityDamageModifier(newStat, StatVariants.ALL);
            break;
        case 12:
            doll.setStabilityIgnore(newStat);
            break;
        case 13:
            doll.setAttackBoost(newStat);
            break;
        case 14:
            doll.setDefense(newStat);
            break;
        case 15:
            doll.setDefenseBuffs(newStat);
            break;
        case 16:
            doll.setDamageDealt(newStat, StatVariants.PHASE);
            break;
        case 17:
            doll.setDamageDealt(newStat, StatVariants.PHYSICAL);
            break;
        case 18:
            doll.setDamageDealt(newStat, StatVariants.FREEZE);
            break;
        case 19:
            doll.setDamageDealt(newStat, StatVariants.BURN);
            break;
        case 20:
            doll.setDamageDealt(newStat, StatVariants.CORROSION);
            break;
        case 21:
            doll.setDamageDealt(newStat, StatVariants.HYDRO);
            break;
        case 22:
            doll.setDamageDealt(newStat, StatVariants.ELECTRIC);
            break;
        default :
            console.error(`${statIndex} out of range of stat array`);
    }
}

function disableBuffEditButtons() {
    for (let i = 0; i < numDolls + numSummons + 1; i++) {
        document.getElementById("AddBuff_" + i).disabled = true;
        document.getElementById("RemoveBuff_" + i).disabled = true;
    }
}

function refreshDollDisplay(dollIndex) {
    let doll = GameStateManager.getInstance().getDoll(selectedDolls[dollIndex]);
    d3.select("#CIndex_" + (dollIndex + 1)).text(`Index ${doll.getCIndex()} / 6`);
    let cooldownText = "Cooldowns:";
    // internally negative cooldown is possible but to avoid confusion just show a lowerbound of 0
    for (let j = 0; j < 4; j++) {
        cooldownText += " " + Math.max(doll.getCooldowns()[j], 0);
    }
    d3.select("#Cooldowns_" + (dollIndex + 1)).text(cooldownText);
}

function updateTargetStatDisplay(statIndex) {
    let target = GameStateManager.getInstance().getTarget();
    targetStatIndex = statIndex;
    // the base stat is editable, the final stat after all buffs is not
    let baseStat = 0;
    let finalStat = 0;
    let statName;
    switch(statIndex) {
        case 0:
            baseStat = target.getBaseDefense();
            finalStat = target.getDefense();
            statName = "Defense";
            break;
        case 1:
            baseStat = target.getStability();
            finalStat = target.getStability();
            statName = "Current Stability";
            break;
        case 2:
            baseStat = target.getBaseDefenseBuffs();
            finalStat = target.getDefenseBuffs();
            statName = "Defense Buffs";
            break;
        case 3:
            baseStat = target.getBaseDamageTaken(StatVariants.ALL);
            finalStat = target.getDamageTaken(StatVariants.ALL);
            statName = "Damage Taken";
            break;
        case 4:
            baseStat = target.getBaseDamageTaken(StatVariants.AOE);
            finalStat = target.getDamageTaken(StatVariants.AOE);
            statName = "AoE Damage Taken";
            break;
        case 5:
            baseStat = target.getBaseDamageTaken(StatVariants.TARGETED);
            finalStat = target.getDamageTaken(StatVariants.TARGETED);
            statName = "Targeted Damage Taken";
            break;
        case 6:
            baseStat = target.getBaseStabilityTakenModifier(StatVariants.ALL);
            finalStat = target.getStabilityTakenModifier(StatVariants.ALL);
            statName = "Stability Damage Taken";
            break;
        case 7:
            baseStat = target.getDRPerStab();
            finalStat = target.getDRPerStab();
            statName = "Damage Reduction Per Stability";
            break;
        case 8:
            baseStat = target.getDRWithStab();
            finalStat = target.getDRWithStab();
            statName = "Damage Reduction With Stability";
            break;
        default :
            console.error(`${statIndex} out of range of stat array`);
    }
    document.getElementById("StatEdit_0").value = baseStat;
    // activate the text input for editing
    document.getElementById("StatEdit_0").disabled = false;
    // display the total with buffs but before edits are made
    document.getElementById("StatTotal_0").value = finalStat;
    // show which stat was selected as a reminder
    document.getElementById("Stat_0").textContent = statName;
}

function refreshTargetDisplay() {
    if (targetStatIndex != -1)
        updateTargetStatDisplay(targetStatIndex);

    let target = GameStateManager.getInstance().getTarget();
    d3.select("#TargetStability")
    .text(`Stability: ${target.getStability()} / ${target.getMaxStability()} (${target.getBrokenTurns()} / ${target.getTurnsToRecover()} Turns)`);
    // display phase weaknesses
    let weaknessText = "Weaknesses:";
    let weaknesses = target.getPhaseWeaknesses();
    for (let i = 0; i < weaknesses.length; i++) {
        weaknessText += " " + weaknesses[i];
    }
    d3.select("#Weaknesses").text(weaknessText);
}

function changeTargetStat() {
    let target = GameStateManager.getInstance().getTarget();
    let newStat = document.getElementById("StatEdit_0").value;
    switch(targetStatIndex) {
        case 0:
            target.setDefense(newStat);
            break;
        case 1:
            target.setStability(newStat);
            break;
        case 2:
            target.setDefenseBuffs(newStat);
            break;
        case 3:
            target.setDamageTaken(newStat, StatVariants.ALL);
            break;
        case 4:
            target.setDamageTaken(newStat, StatVariants.AOE);
            break;
        case 5:
            target.setDamageTaken(newStat, StatVariants.TARGETED);
            break;
        case 6:
            target.setStabilityTakenModifier(newStat, StatVariants.ALL);
            break;
        case 7:
            target.applyDRPerStab(newStat);
            break;
        case 8:
            target.applyDRWithStab(newStat);
            break;
        default :
            console.error(`${statIndex} out of range of stat array`);
    }
}

function refreshTurnText() {
    let textHTML = document.getElementById("SimControls").children;
    // get how many dolls can currently act
    let dolls = GameStateManager.getInstance().getAllDolls();
    let readyDolls = 0;
    dolls.forEach(doll => {
        readyDolls += doll.hasTurnAvailable();
    });
    d3.select(textHTML[0]).style("opacity", 0).transition()
                        .duration(200)
                        .style("opacity", 1)
                        .text(`Round ${GameStateManager.getInstance().getRoundNumber()}: ${readyDolls > 0 ? "Your" : "Enemy"} Turn`);
    textHTML[1].textContent = `Total Damage: ${StatTracker.getInstance().getTotalDamage()}`;
}