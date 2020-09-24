"use strict"

function bindButton(el, context, targetName, listeners, applyListeners = true) {
    if (!(context[targetName] instanceof Function))
        return false;

    if (el.getAttribute("listenerRegistered") === "true")
        return true;

    let bindEntry = {
        event: "click",
        el: el,
        function: ev => context[targetName].length > 0 ? context[targetName](ev) : context[targetName]()
    }
    listeners.push(bindEntry);
    if (applyListeners)
        bindEntry.el.addEventListener(bindEntry.event, bindEntry.function);

    el.setAttribute("listenerRegistered", "true");
    return true;
}

function bindInput(el, context, targetName, listeners, applyListeners = true) {
    if (typeof (context[targetName]) != "string" && isNaN(context[targetName]))
        return false;

    let suppressState = { suppressWhenLive: true, suppress: false };

    el.value = context[targetName];
    if (context.bindings != null) {
        if (context.bindings[targetName] == null)
            context.bindings[targetName] = [];

        context.bindings[targetName].push({
            el: el,
            update: function () {
                if (!suppressState.suppress)
                    el.value = context[targetName]
            }
        });
    }

    if (el.getAttribute("listenerRegistered") === "true")
        return true;

    let funcName = `set${targetName.substr(0, 1).toUpperCase()}${targetName.substr(1)}`;
    let funcNameLive = `set${targetName.substr(0, 1).toUpperCase()}${targetName.substr(1)}Live`;

    if (!(context[funcName] instanceof Function))
        return false;

    if (!(context[funcNameLive] instanceof Function))
        funcNameLive = funcName;

    let bindEntry = {
        event: "input",
        el: el,
        suppressState: suppressState,
        function: function () {
            try {
                if (suppressState.suppressWhenLive)
                    suppressState.suppress = true;
                context[funcNameLive](el.value);
                suppressState.suppress = false;
            } catch (ex) { }
        }
    }
    listeners.push(bindEntry);
    if (applyListeners)
        bindEntry.el.addEventListener(bindEntry.event, bindEntry.function);

    bindEntry = {
        event: "change",
        el: el,
        function: function () {
            try {
                context[funcName](el.value);
            } catch (ex) {
                alert("Invalid value! " + ex.toString());
                return false;
            }
        }
    }
    listeners.push(bindEntry);
    if (applyListeners)
        bindEntry.el.addEventListener(bindEntry.event, bindEntry.function);

    el.setAttribute("listenerRegistered", "true");
    return true;
}

function bindContent(el, context, targetName, listeners, applyListeners = true) {
    if (typeof (context[targetName]) == "string" || !isNaN(context[targetName])) {
        el.innerHTML = context[targetName];

        if (context.bindings != null) {
            if (context.bindings[targetName] == null)
                context.bindings[targetName] = [];
            context.bindings[targetName].push({
                el: el,
                update: () => el.innerHTML = context[targetName]
            });
        } else {
            console.log("WARN: Missing out on bindings!");
        }
        return true;
    }

    if (el.getAttribute("binding-placed") === "true")
        return true;

    let target = context[targetName];
    if (!(target instanceof Element))
        target = target.el;
    if (!(target instanceof Element))
        return false;

    el.appendChild(target);
    el.setAttribute("binding-placed", "true");
}

function removeFromArr(arr, el) {
    for (let i in arr) {
        if (arr[i] === el) {
            arr.splice(i, 1);
            break;
        }
    }
}

function bindColor(el, context, targetName, listeners, applyListeners = true) {
    let colorObj = context[targetName];

    if (colorObj.value === undefined)
        colorObj.value = "#000";

    let swatches = [
        'rgba(244, 67, 54, 1)',
        'rgba(233, 30, 99, 0.95)',
        'rgba(156, 39, 176, 0.9)',
        'rgba(103, 58, 183, 0.85)',
        'rgba(63, 81, 181, 0.8)',
        'rgba(33, 150, 243, 0.75)',
        'rgba(3, 169, 244, 0.7)',
        'rgba(0, 188, 212, 0.7)',
        'rgba(0, 150, 136, 0.75)',
        'rgba(76, 175, 80, 0.8)',
        'rgba(139, 195, 74, 0.85)',
        'rgba(205, 220, 57, 0.9)',
        'rgba(255, 235, 59, 0.95)',
        'rgba(255, 193, 7, 1)'
    ];

    if (colorObj.swatches !== undefined)
        swatches = colorObj.swatches;

    // Source: https://www.npmjs.com/package/@simonwep/pickr
    colorObj.pickr = Pickr.create({
        el: el,
        theme: 'classic', // or 'monolith', or 'nano'
        //container: panel.el,
        comparison: false,
        default: colorObj.value,

        swatches: swatches,

        components: {
            // Main components
            //preview: true,
            opacity: true,
            hue: true,

            // Input / output Options
            interaction: {
                hex: true,
                rgba: true,
                hsla: true,
                hsva: true,
                cmyk: true,
                input: true,
                clear: false,
                save: false
            }
        }
    });

    if (context.bindings != null) {
        if (context.bindings[targetName] == null)
            context.bindings[targetName] = [];

        context.bindings[targetName].push({
            el: el,
            update: () => colorObj.pickr.setColor(colorObj.value)
        });
    }

    // let wasAccepted = pickr.setColor(panel.obj.color);
    // console.log(wasAccepted);
    // wasAccepted = pickr.applyColor();
    // console.log(wasAccepted);
    // console.log(panel.obj.color);

    let funcName = `set${targetName.substr(0, 1).toUpperCase()}${targetName.substr(1)}`;
    let funcNameLive = `set${targetName.substr(0, 1).toUpperCase()}${targetName.substr(1)}Live`;

    if (!(context[funcName] instanceof Function))
        return false;

    if (!(context[funcNameLive] instanceof Function))
        funcNameLive = funcName;

    colorObj.pickr.on("change", function (color, instance) {
        // let d = new Date();
        // let timeString = pad(d.getHours(), 2) + ":"
        //     + pad(d.getMinutes(), 2) + ":"
        //     + pad(d.getSeconds(), 2);

        //console.log(`[${timeString}] Color changed!`);
        context[funcNameLive](color.toRGBA().toString(2));
    });

    colorObj.pickr.on("save", function (color, instance) {
        // let d = new Date();
        // let timeString = pad(d.getHours(), 2) + ":"
        //     + pad(d.getMinutes(), 2) + ":"
        //     + pad(d.getSeconds(), 2);

        //console.log(`[${timeString}] Color changed!`);
        context[funcName](color.toRGBA().toString(2));
    });
    return true;
}

function tryBinding(el, viewModel, listenToInput = true) {
    let name = el.getAttribute("data-binding");
    let type = el.getAttribute("binding-type") || "content";
    if (name == null)
        return false;

    if (el.tagName == "INPUT") {
        if (el.type == "button")
            type = "button";
        else if (el.type == "color")
            type = "color";
        else
            type = "input";

    } else if (el.tagName == "BUTTON") {
        type = "button";
    }

    let context = viewModel;
    let target = viewModel[name];

    let targetName = name;
    if (target == null) {
        let parts = name.split(" ");
        target = viewModel;
        for (let p of parts) {
            context = target;
            target = target[p];
            targetName = p;
            if (target == null)
                return false;
        }
    }

    if (viewModel.listeners == null)
        viewModel.listeners = [];

    switch (type) {
        case "button": {
            return bindButton(el, context, targetName, viewModel.listeners);
        }

        case "input": {
            return bindInput(el, context, targetName, viewModel.listeners);
        }

        case "content": {
            return bindContent(el, context, targetName, viewModel.listeners);
        }

        case "color": {
            return bindColor(el, context, targetName, viewModel.listeners);
        }

        default:
            return false;
    }
}

// function bindValueToElements(el, name, handlersStructs) {
//     if (handlersStructs == null)
//         handlersStructs = []
//     else if (!(handlersStructs instanceof Array))
//         handlersStructs = [handlersStructs];

//     for (let binding of $(`[data-binding=${name}]`, el)) {
//         for (let handlersStruct of handlersStructs) {
//             if (tryBinding(binding, handlersStruct))
//                 break;
//         }
//     }
// }

function bindElements(el, vals, filter = null) {
    if (!(vals instanceof Array))
        vals = [vals];
    let foundBinding;
    for (let bindingEl of $("[data-binding]", el)) {
        let name = bindingEl.getAttribute("data-binding");
        if (name.endsWith("#"))
            continue;

        foundBinding = false;
        for (let context of vals) {
            if (tryBinding(bindingEl, context)) {
                foundBinding = true;
                break;
            }
        }
        if (!foundBinding) {
            //console.log(`WARN: Binding ${name} not found`);
        }
    }
}

// function bindElements(el, vals, filter = null) {
//     if (!(vals instanceof Array))
//         vals = [vals];

//     for (let struct of vals) {
//         for (let name in Object.getpropes(struct.getOwnPropertyNames()) {
//             if (filter != null && !filter.includes(name))
//                 continue;
//             bindValueToElements(el, name, struct);
//         }
//     }
// }

// Source: https://stackoverflow.com/questions/2998784/how-to-output-numbers-with-leading-zeros-in-javascript
function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

function updateBinding(struct, name) {
    if (struct.bindings == null || struct.bindings[name] == null)
        return;

    for (let hand of struct.bindings[name])
        hand.update();//{ detail: { newValue: struct[name] } });
}

function getRectanglesIntersection(rect1, rect2) {
    let left = Math.max(rect1.x, rect2.x);
    let top = Math.max(rect1.y, rect2.y);
    let right = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
    let bottom = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);

    return new DOMRect(left, top, right - left, bottom - top);
}

function createLaTeXSVGCode(code, callback) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = code;
    let svgCode;
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, wrapper]);
    MathJax.Hub.Queue(function () {
        let mjOut = wrapper.getElementsByTagName("svg")[0];
        if (mjOut == null)
            return;//callback(code);
        mjOut.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svgCode = mjOut.outerHTML;
        //svgCode = wrapper.innerHTML;
        callback(svgCode);
    });
}

function setLaTeXContent(el, code) {
    createLaTeXSVGCode(`\\[${code}\\]`, function (svgCode) {
        el.innerHTML = svgCode;
    });
}
