"use strict";
// MIT License

// Copyright (c) 2020 Vincent Kuhlmann

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

let markings = {};
let markingID = 0;
let openPanels = [];

function setTopPanel(panel) {
    let zIndex = 0;
    let found = false;
    for (const p of openPanels) {
        if (p === panel)
            found = true;
        else
            zIndex = Math.max(zIndex, p.zIndex);
    }
    panel.zIndex = zIndex + 1;
    panel.el.style["z-index"] = panel.zIndex;
    if (!found)
        openPanels.push(panel);
}

function removePanelFromStack(panel) {
    for (let i = 0; i < openPanels.length;) {
        if (openPanels[i] === panel) {
            openPanels.splice(i);
        } else {
            i++;
        }
    }
}

function hoverPointEdit(obj, view) {
    let rect = obj.presences[view].el.getBoundingClientRect();
    let containerRect = view.el.getBoundingClientRect();

    let margin = 10;
    view.highlight.el.style.left = `${rect.x - containerRect.x - margin}px`;
    view.highlight.el.style.top = `${rect.y - containerRect.y - margin}px`;
    view.highlight.el.style.width = `${rect.width + 2 * margin}px`;
    view.highlight.el.style.height = `${rect.height + 2 * margin}px`;
    view.highlight.el.style.display = "block";

    obj.presences[view].el.addEventListener("pointerleave", function () {
        view.highlight.el.style.display = "none";
    });
}

//function tryBinding(el, )

function bindValueToElements(el, name, value, handlersStructs) {
    if (handlersStructs == null)
        handlersStructs = []
    else if (!(handlersStructs instanceof Array))
        handlersStructs = [handlersStructs];

    for (let binding of $(`[data-binding=${name}]`, el)) {
        let type = "innerHTML";
        if (binding.tagName == "INPUT") {
            if (binding.type == "button")
                type = "button";
            else
                type = "input";
            if (!(typeof (value) == "string") && isNaN(value))
                continue;

        } else if (binding.tagName == "BUTTON") {
            type = "button";
            if (!(value instanceof Function))
                continue;
        }

        switch (type) {
            case "button": {
                if (binding.getAttribute("listenerRegistered") !== "true") {
                    //for (let handlersStruct of handlersStructs) {
                    if (value instanceof Function) {
                        let bindEntry = {
                            event: "click",
                            el: binding,
                            function: ev => value.length > 0 ? value(ev) : value()
                        }
                        bindEntry.el.addEventListener(bindEntry.event, bindEntry.function);

                        if (handlersStructs.length >= 1){
                            if (handlersStructs[0].listeners == null)
                                handlersStructs[0].listeners = [];
                            handlersStructs[0].listeners.push(bindEntry);
                        }
                        binding.setAttribute("listenerRegistered", "true");
                        break;
                    }
                    //}
                }
            }
                break;

            case "input": {
                binding.value = value;

                for (let handlersStruct of handlersStructs) {
                    if (handlersStruct.bindings != null) {
                        if (handlersStruct.bindings[name] == null)
                            handlersStruct.bindings[name] = [];
                        handlersStruct.bindings[name].push({
                            el: binding,
                            update: (ev) => binding.value = ev.detail.newValue
                        });
                        break;
                    }
                }

                if (binding.getAttribute("listenerRegistered") !== "true") {
                    let funcName = `set${name.substr(0, 1).toUpperCase()}${name.substr(1)}`;
                    let funcNameLive = `set${name.substr(0, 1).toUpperCase()}${name.substr(1)}Live`;

                    for (let handlersStruct of handlersStructs) {
                        if (!(handlersStruct[funcName] instanceof Function))
                            continue;

                        if (!(handlersStruct[funcNameLive] instanceof Function))
                        funcNameLive = funcName;

                        let bindEntry = {
                            event: "input",
                            el: binding,
                            function: function () {
                                try {
                                    handlersStruct[funcNameLive](binding.value);
                                } catch (ex) { }
                            }
                        }
                        bindEntry.el.addEventListener(bindEntry.event, bindEntry.function);
                        if (handlersStruct.listeners == null)
                            handlersStruct.listeners = [];
                        handlersStruct.listeners.push(bindEntry);

                        bindEntry = {
                            event: "change",
                            el: binding,
                            function: function () {
                                try {
                                    handlersStruct[funcName](binding.value);
                                } catch (ex) {
                                    alert("Invalid value! " + ex.toString());
                                    return false;
                                }
                            }
                        }
                        bindEntry.el.addEventListener(bindEntry.event, bindEntry.function);
                        handlersStruct.listeners.push(bindEntry);

                        if (handlersStruct.listeners == null)
                            handlersStruct.listeners = [];
                        handlersStruct.listeners.push(bindEntry);
                        binding.setAttribute("listenerRegistered", "true");
                        break;
                    }
                }
            }
                break;

            case "innerHTML": {
                if (!(typeof (value) == "string") && isNaN(value))
                    continue;
                binding.innerHTML = value;

                for (let handlersStruct of handlersStructs) {
                    if (handlersStruct.bindings != null) {
                        if (handlersStruct.bindings[name] == null)
                            handlersStruct.bindings[name] = [];
                        handlersStruct.bindings[name].push({
                            el: binding,
                            update: (ev) => binding.innerHTML = ev.detail.newValue
                        });
                        break;
                    }
                }
            }
                break;
        }
    }
}

function bindElements(el, vals, filter = null) {
    if (!(vals instanceof Array))
        vals = [vals];

    for (let struct of vals) {
        for (let name in struct) {
            if (filter != null && !filter.includes(name))
                continue;
            bindValueToElements(el, name, struct[name], struct);
        }
    }
}

// Source: https://stackoverflow.com/questions/2998784/how-to-output-numbers-with-leading-zeros-in-javascript
function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

function updateBinding(struct, name) {
    if (struct.bindings == null || struct.bindings[name] == null
        || struct[name] === undefined)
        return;

    for (let hand of struct.bindings[name])
        hand.update({ detail: { newValue: struct[name] } });
}

function bindPointEditElements(panel) {
    // $("[data-binding=closeButton]", panel.el).on("click", function () {
    //     panel.close();
    // });

    // function updateField(name) {
    //     for (let binding of $(`[data-binding=${name}]`, panel.el)) {
    //         if (binding.tagName == "INPUT") {
    //             binding.value = panel.obj[name];

    //             if (binding.getAttribute("listens") !== "true") {
    //                 binding.addEventListener("input", function () {
    //                     try {
    //                         panel.obj[`set${name.substr(0, 1).toUpperCase()}${name.substr(1)}`](binding.value);
    //                     } catch (ex) { }
    //                 });
    //                 binding.addEventListener("change", function () {
    //                     try {
    //                         panel.obj[`set${name.substr(0, 1).toUpperCase()}${name.substr(1)}`](binding.value);
    //                     } catch (ex) {
    //                         alert("Invalid value! " + ex.toString());
    //                         return false;
    //                     }
    //                 });

    //                 binding.setAttribute("listens", "true");
    //             }
    //         } else {
    //             binding.innerHTML = panel.obj[name];
    //         }
    //     }
    // }

    // const regularFields = ["label", "x", "ct"];

    // function updateFields() {
    //     for (name of regularFields) {
    //         updateField(name);
    //     }
    // }

    function createColorBinding(name) {
        let suppressUpdate = false;

        let targetElements = $(`[data-binding=${name}]`, panel.el).toArray();
        if (targetElements == 0)
            return;

        if (panel.obj.color === undefined)
            panel.obj.color = "#000";

        // Source: https://www.npmjs.com/package/@simonwep/pickr
        const pickr = Pickr.create({
            el: targetElements[0],
            theme: 'classic', // or 'monolith', or 'nano'
            //container: panel.el,
            comparison: false,
            default: panel.obj.color,

            swatches: [
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
            ],

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
                    clear: true,
                    save: false
                }
            }
        });

        // let wasAccepted = pickr.setColor(panel.obj.color);
        // console.log(wasAccepted);
        // wasAccepted = pickr.applyColor();
        // console.log(wasAccepted);
        // console.log(panel.obj.color);

        pickr.on("change", function (color, instance) {
            let d = new Date();
            let timeString = pad(d.getHours(), 2) + ":"
                + pad(d.getMinutes(), 2) + ":"
                + pad(d.getSeconds(), 2);

            //console.log(`[${timeString}] Color changed!`);
            panel.obj[`set${name.substr(0, 1).toUpperCase()}${name.substr(1)}`](color.toRGBA().toString(2));
        });

        panel.pickr = pickr;
    }

    bindElements(panel.el, [panel, panel.obj.presences[panel.view], panel.obj]);
    //updateFields();
    createColorBinding("color");
}

function createPanelFromTemplate(template, view) {
    let canceled = !view.el.dispatchEvent(new CustomEvent("panelcreating",
        {
            bubbles: true,
            detail: {
                template: template,
                view: view
            },
            cancelable: true
        }));
    if (canceled) {
        panelClose();
        return false;
    }

    let panel = {};
    panel.el = createTemplateInstance(template, view.el);
    panel.view = view;

    panel.close = function () {
        if (panel.el != null && !panel.el.dispatchEvent(new CustomEvent("closing", { detail: { panel: this }, cancelable: true, bubbles: false })))
            return false;
        // if (panel.pickr != null) {
        //     panel.pickr.hide();
        //     panel.pickr.destroyAndRemove();
        //     panel.pickr = null;
        // }
        if (panel.el != null) {
            panel.el.style.display = "none";
            panel.el.dispatchEvent(new CustomEvent("closed", { detail: { panel: this }, cancelable: false, bubbles: false }));
            panel.el.remove();
        }

        removePanelFromStack(panel);
        panel.el = null;
        return true;
    };

    panel.show = function () {
        if (panel.el != null) {
            if (!panel.el.dispatchEvent(new CustomEvent("show", { detail: { panel: this }, cancelable: true, bubbles: false })))
                return false;
            panel.el.style.visibility = "visible";
            return true;
        }
        return undefined;
    };

    panel.hide = function () {
        if (panel.el != null) {
            if (!panel.el.dispatchEvent(new CustomEvent("hide", { detail: { panel: this }, cancelable: true, bubbles: false })))
                return false;
            panel.el.style.visibility = "hidden";
            return true;
        }
        return undefined;
    };

    panel.setPositionOnViewport = function (x, y) {
        if (panel.el != null) {
            panel.el.style.left = `${x - panel.view.el.getBoundingClientRect().left}px`;
            panel.el.style.top = `${y - panel.view.el.getBoundingClientRect().top}px`;
        }
    }

    panel.getPositionOnViewport = function () {
        let rect = panel.el.getBoundingClientRect();
        return { x: rect.left, y: rect.top };
    }

    panel.getWidth = function () {
        return panel.el?.getBoundingClientRect().width;
    };

    panel.getHeight = function () {
        return panel.el?.getBoundingClientRect().height;
    };

    panel.moving = false;
    $(".panel-grip", panel.el).on("pointerdown", function (ev) {
        panel.moving = true;
        this.style.cursor = "move";

        let prevPos = panel.getPositionOnViewport();
        let translX = prevPos.x - ev.screenX;
        let translY = prevPos.y - ev.screenY;

        function onMove(moveEv) {
            if (ev.pointerId !== moveEv.pointerId)
                return;
            panel.setPositionOnViewport(moveEv.screenX + translX, moveEv.screenY + translY);
        }

        this.addEventListener("pointermove", onMove);

        this.addEventListener("pointerup", function () {
            panel.moving = false;
            this.style.cursor = "auto";
            this.removeEventListener("pointermove", onMove);
        });
    });

    bindElements(panel.el, [panel]);
    return panel;
}

function positionPanel(panel, targetRect, targetMargin = 10, panelContainBounds = null) {
    let alignRect = new DOMRect(targetRect.left - targetMargin, targetRect.top - targetMargin,
        targetRect.width + 2 * targetMargin, targetRect.height + 2 * targetMargin);

    let panelWidth = panel.getWidth();
    let panelHeight = panel.getHeight();

    if (panelContainBounds == null)
        panelContainBounds = document.body.getBoundingClientRect();

    let freeOnLeft = alignRect.left - panelContainBounds.left;
    let freeOnRight = panelContainBounds.right - alignRect.right;

    let freeOnTop = alignRect.top - panelContainBounds.top;
    let freeOnBottom = panelContainBounds.bottom - alignRect.bottom;

    let alignOnLeft = freeOnLeft >= panelWidth && freeOnRight < panelWidth;
    let alignOnTop = freeOnTop >= panelHeight && freeOnBottom < panelHeight;

    let left;
    let top;

    if (alignOnLeft)
        left = alignRect.left - panelWidth;
    else
        left = Math.max(Math.min(alignRect.right, panelContainBounds.right - panelWidth), panelContainBounds.left);

    if (alignOnTop)
        top = alignRect.top - panelHeight;
    else
        top = Math.max(Math.min(alignRect.bottom, panelContainBounds.bottom - panelHeight), panelContainBounds.top);
    panel.setPositionOnViewport(left, top);

}

function openPointEdit(obj, view, closeOnOtherOpen = false) {
    if (obj.currentEditPanel == null) {
        let panel = createPanelFromTemplate($("#pointEditPanel")[0], view);
        if (panel == null)
            return false;

        panel.obj = obj;
        panel.view = view;

        panel.reposition = function () {
            positionPanel(this, this.obj.presences[view].el.getBoundingClientRect());
        };

        panel.reposition();

        bindPointEditElements(panel);

        let canceled = !view.el.dispatchEvent(new CustomEvent("panelopen",
            {
                bubbles: true,
                detail: {
                    panel: panel
                },
                cancelable: true
            }));
        if (canceled) {
            panelClose();
            return false;
        }

        panel.el.addEventListener("closed", function (e) {
            if (panel.pickr != null) {
                panel.pickr.destroyAndRemove();
                panel.pickr = null;
            }

            if (obj.currentEditPanel === panel)
                obj.currentEditPanel = null;
        });
        obj.currentEditPanel = panel;
        panel.show();

        if (closeOnOtherOpen) {
            let autoCloseFunction = function () {
                panel.close();
                view.el.removeEventListener("panelopen", autoCloseFunction);
            }

            view.el.addEventListener("panelopen", autoCloseFunction);
        }
    }
    setTopPanel(obj.currentEditPanel);
    return true;
}

let views = [];

function AddMarkingToView(obj, view) {
    if (obj.presences === null)
        obj.presences = {};

    diagramIndications = $("[data-binding=diagram-indications]", view.el)[0];
    let el = createTemplateInstance("pointmarker", diagramIndications);

    obj.presences[view] = { view: view, el: el, bindings: [] };

    //$("[data-binding=label]", el)[0].innerHTML = obj.label;
    el.id = `view${view.id}_marking${markingID}`;
    markingID += 1;

    markings[obj.id] = obj;

    obj.presences[view].setPos = function (x, ct) {
        this.transformedX = x;
        this.transformedCt = ct;
        //obj.x = x;
        //obj.ct = ct;
        this.el.setAttribute("transform", `translate(${x} ${-ct})`);
    };

    //obj.presences[view].setPos(obj.x, obj.ct);

    obj.presences[view].setSpeed = function (beta) {
        obj.presences[view].beta = beta;
        let gamma = Math.sqrt(1 / (1 - (beta * beta)))
        let xTransf = gamma * (obj.x - beta * obj.ct);
        let ctTransf = gamma * (obj.ct - beta * obj.x);

        this.setPos(xTransf, ctTransf);
    };
    obj.presences[view].setSpeed(0);

    el.addEventListener("pointerover",
        function () {
            hoverPointEdit(obj, view);
        });
    el.addEventListener("pointerdown",
        function () {
            openPointEdit(obj, view);
        });

    bindElements(el, [obj.presences[view], obj]);
    el.style.visibility = "visible";
}

function AddMarking(obj) {
    if (obj.type === "point") {
        if (obj.bindings == null)
            obj.bindings = [];

        obj.presences = {};

        obj.setLabel = function (label) {
            if (label == "sinterklaas")
                throw "Hoofdletters!";
            obj.label = label;
            updateBinding(obj, "label");
            //$("[data-binding=label]", el)[0].innerHTML = obj.label;
        }

        obj.setColor = function (color) {
            obj.color = color;
            //$("[data-binding=centerpoint]", obj.el)[0].style.fill = obj.color;
            obj.el.style.fill = obj.color;
            obj.el.dispatchEvent(new CustomEvent("colorchanged", { detail: { color: obj.color, obj: obj } }));
        }

        obj.setX = function (x) {
            obj.x = x;
            updateBinding(obj, "x");
            for (let view in obj.presences) {
                obj.presences[view].setSpeed(obj.presences[view].beta);
            }
        }

        obj.setCt = function (ct) {
            obj.ct = ct;
            updateBinding(obj, "ct");
            for (let view in obj.presences) {
                obj.presences[view].setSpeed(obj.presences[view].beta);
            }
        }

        for (let view of views) {
            AddMarkingToView(obj, view);
        }
    }
};

let currentSpeed = 0.0;

function updatePNG() {
    /* Source: https://stackoverflow.com/questions/12255444/copy-svg-images-from-browser-to-clipboard */
    svgAsPngUri(document.getElementById("diagram"), { scale: 8.0 }).then(uri => {
        $("#diagram_png").attr('src', uri).show();
    });
}

$(document).ready(function () {
    debugger;

    views.push({ el: $("#diagram-view")[0], id: 0 });
    views[0].highlight = { el: $("#diagram-highlight", views[0].el)[0] };

    $("#diagram_png")[0].style.width = `${$("#diagram")[0].clientWidth}px`;
    $("#diagram_png")[0].style.height = `${$("#diagram")[0].clientHeight}px`;

    updatePNG();
    AddMarking({ type: "point", x: 10, ct: 30, label: "Cool!" });
    AddMarking({ type: "point", x: -10, ct: 30, label: "Super cool!" });

    $("#speedSlider")[0].value = 0;

    $("#speedSlider").on('input', function () {
        //debugger;
        //speedDiff = $("#speedSlider")[0].value - currentSpeed;
        currentSpeed = $("#speedSlider")[0].value * 1 / 100;

        for (const id in markings) {
            markings[id].presences[views[0]]?.setSpeed(currentSpeed);
        }
        console.log(`Speed has been set to ${currentSpeed}`);
    });

    //initColorPicker();
});
