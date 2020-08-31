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
            obj.bindings = {};

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

    //createLayout();

    //initColorPicker();
});
