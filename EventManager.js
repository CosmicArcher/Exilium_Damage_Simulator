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
                EventManagerSingleton.listeners[eventName].add(func);
            else {
                // initialize jquery callback
                EventManagerSingleton.listeners[eventName] = $.Callbacks();
                EventManagerSingleton.listeners[eventName].add(func);
            }
        }
        else
            console.error("Singleton not yet initialized");
    }

    broadcastEvent(eventName, param) {
        if (EventManagerSingleton) {
            if (EventManagerSingleton.listeners.hasOwnProperty(eventName))
                EventManagerSingleton.listeners[eventName].fire(param);
            else {
                console.error(`${eventName} listeners do not exist`);
            }
        }
        else
            console.error("Singleton not yet initialized");
    }
}

export default EventManager;