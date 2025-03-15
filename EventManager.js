let EventManagerSingleton;

class EventManager {
    constructor() {
        if (EventManagerSingleton) {
            console.error("Singleton already exists");
        }
        else {
            console.log("Event Manager Instantiated");
            EventManagerSingleton = this;
            // contains the event name as the key and the jquery callback
            EventManagerSingleton.listeners = {};
        }
    }

    static getInstance() {
        if (!EventManagerSingleton)
            new EventManager();
        return EventManagerSingleton;
    }

    addListener(eventName, func) {
        if (EventManagerSingleton) {
            if (EventManagerSingleton.listeners.hasOwnProperty(eventName))
                EventManagerSingleton.listeners[eventName].push(func);
            else {
                // initialize array belonging to event name
                EventManagerSingleton.listeners[eventName] = [];
                EventManagerSingleton.listeners[eventName].push(func);
            }
        }
        else
            console.error("Singleton not yet initialized");
    }

    broadcastEvent(eventName, param) {
        if (EventManagerSingleton) {
            if (EventManagerSingleton.listeners.hasOwnProperty(eventName))
                EventManagerSingleton.listeners[eventName].forEach(d => {
                    // for any events that require multiple parameters, pass an array as param and process it in the function as a single array parameter
                    d(param);
                });
            else {
                console.error(`${eventName} listeners do not exist`);
            }
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default EventManager;