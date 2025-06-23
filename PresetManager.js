let PresetManagerSingleton;

class PresetManager {
    constructor() {
        if (PresetManagerSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Preset Manager Instantiated");
            PresetManagerSingleton = this;
            // default starting value of mode
            PresetManagerSingleton.mode = "Target";
        }
    }

    static getInstance() {
        if (!PresetManagerSingleton)
            new PresetManager();
        return PresetManagerSingleton;
    }

    getPresetMode() {
        if (PresetManagerSingleton) {
            return PresetManagerSingleton.mode;
        }
        else
            console.error("Singleton not yet initialized");
    }
    // input box is shared between the two modes with a flag keeping track of which preset input is selected
    displayPresetInputBox() {
        d3.select("#Preset").style("display", "Block");
    }

    closePresetInput() {
        // clear the text box after finishing so that it appears neater for the next preset input if needed
        document.getElementById("PresetInput").value = "";
        d3.select("#Preset").style("display", "None");
    }

    inputTargetPreset() {
        if (PresetManagerSingleton) {
            PresetManagerSingleton.mode = "Target";
            PresetManagerSingleton.displayPresetInputBox();
        }
        else
            console.error("Singleton not yet initialized");
    }

    inputDollPreset() {
        if (PresetManagerSingleton) {
            PresetManagerSingleton.mode = "Dolls";
            PresetManagerSingleton.displayPresetInputBox();
        }
        else
            console.error("Singleton not yet initialized");
    }

    applyTargetPreset(data) {
        let htmlElement = document.getElementById("TargetColumn");
        // format of the target preset: [name, weaknesses, isLarge, isBoss, def, max stability, ... dr with stability] where weaknesses are separated by spaces
        // as the comma delimiter is already used for the initial array
        let stringData = [];
        // name is just a string, no need to process it further
        stringData.push(data[0]);
        // weaknesses are an array so they are separated with a space as comma is no longer available
        let weaknesses = data[1].split(" ");
        stringData.push([]);
        weaknesses.forEach(weakness => {
            stringData[1].push(weakness);
        });
        // isLarge and isBoss is applied through check boxes rather than text boxes so the applynumericpreset function does not cover it
        document.getElementById("largeToggle").checked = +data[2];
        document.getElementById("bossToggle").checked = +data[3];
        // use iterator i as an object because we need to edit the value across a recursive function so we need to mimic a pointer parameter
        let ival = {val : 4};
        // go through each element for text inputs and replace the current values with the preset data
        PresetManagerSingleton.applyNumericPreset(htmlElement, data, ival);

        return stringData;
    }

    applyDollPreset(data) {
        let stringData = [];
        for (let i = 0; i < data.length; i++) {
            let htmlElement = document.getElementById("Doll_" + (i + 1));
            // format of the doll preset: [name, fortification, keys, weapon, calibration, hasPhaseStrike, attack, ... elemental damage] 
            // where keys are separated by spaces
            // as the comma delimiter is already used for the initial array
            stringData.push([]);
            // name and fortification do not need further processing
            stringData[i].push(data[i][0]);
            stringData[i].push(data[i][1]);
            // keys are a binary array of 6 elements so they are separated with a space as comma is no longer available
            let keys = data[i][2].split(" ");
            stringData[i].push([]);
            // add safety in case the array is greater than 6 elements and if more than 3 keys were selected in the preset
            let keySum = 0;
            for (let j = 0; j < 6; j++) {
                if (keySum < 3) {
                    stringData[i][2].push(+keys[j]);
                    keySum += +keys[j];
                }
                // once we reach 3 active keys, default the remaining slots to inactive
                else
                    stringData[i][2].push(0);
            }
            // weapon and calibration do not need further processing
            stringData[i].push(data[i][3]);
            stringData[i].push(data[i][4]);
            // hasPhaseStrike is applied through check boxes rather than text boxes so the applynumericpreset function does not cover it
            htmlElement.children[i > 0 ? 17 : 16].checked = +data[i][5];
            // use iterator i as an object because we need to edit the value across a recursive function so we need to mimic a pointer parameter
            let ival = {val : 6};
            // go through each element for text inputs and replace the current values with the preset data
            PresetManagerSingleton.applyNumericPreset(htmlElement, data[i], ival);
        }

        return stringData;
    }
    // change the values in the textboxes to match the preset data, recursive in case of text boxes nested deeper in the html element
    applyNumericPreset(htmlElement, data, ival) {
        htmlElement.childNodes.forEach(element => {
            if (element.type == "text") {
                // since we are not checking the number of text inputs beforehand, we put an error once we find out that it exceeds the length of the preset data
                if (ival.val == data.length)
                    console.error(`Text Boxes ${ival.val} exceeds preset data ${[data]} length`);

                element.value = data[ival.val];
                ival.val++;
            }
            else if (element.childNodes.length > 0)
                PresetManagerSingleton.applyNumericPreset(element, data, ival);
        });
    }
    // change the html input boxes' values of the corresponding input mode to the input values
    parsePresetData() {
        if (PresetManagerSingleton) {
            let presetData = document.getElementById("PresetInput").value;
            // double check that there is something input
            if (presetData.length > 0) {
                // most of the input is read from the valeus in the text boxes at the start of the simulation but strings like names, weaknesses, weapons are
                let stringData;
                if (PresetManagerSingleton.mode == "Target") {
                    // the presets should follow a csv format and that is the assumption we will go with
                    let data = presetData.split(",");
                    stringData = PresetManagerSingleton.applyTargetPreset(data);
                }
                else if (PresetManagerSingleton.mode == "Dolls") {
                    // the individual doll presets should follow a csv format while each doll is separated via colons
                    let data = presetData.split(";");
                    for (let i = 0; i < data.length; i++)
                        data[i] = data[i].split(",");
                    stringData = PresetManagerSingleton.applyDollPreset(data);
                }
        
                return stringData;
            }
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default PresetManager;