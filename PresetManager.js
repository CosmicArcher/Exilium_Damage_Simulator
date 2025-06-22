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
        d3.select("#Preset").style("display", "None");
    }

    inputTargetPreset() {
        if (PresetManagerSingleton) {
            PresetManagerSingleton.displayPresetInputBox();
        }
        else
            console.error("Singleton not yet initialized");
    }

    inputDollPreset() {
        if (PresetManagerSingleton) {
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
                // the presets should follow a csv format and that is the assumption we will go with
                let data = presetData.split(",");
                let htmlElement;
                // most of the input is read from the valeus in the text boxes at the start of the simulation but strings like names, weaknesses, weapons are
                let stringData;
                if (PresetManagerSingleton.mode == "Target") {
                    stringData = PresetManagerSingleton.applyTargetPreset(data);
                }
                else if (PresetManagerSingleton.mode == "Dolls") {
                    htmlElement = document.getElementById("Doll_1");
                }

                return stringData;
            }
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default PresetManager;