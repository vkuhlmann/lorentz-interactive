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

let markingID = 0;
let openPanels = [];

let handleDiagram = {
    pointerover: null,
    pointerleave: null,
    click: null,
    pointerdown: null,
    pointerup: null,
    pointermove: null,
    dismiss: null
}
let handleDiagramAvailable = false;

function setTopPanel(panel) {
    let zIndex = 2;
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
        this.setPointerCapture(ev.pointerId);
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
            this.releasePointerCapture(ev.pointerId);
            panel.moving = false;
            this.style.cursor = "auto";
            this.removeEventListener("pointermove", onMove);
        });
    });

    bindElements(panel.el, [panel]);
    panel.hide();
    activateTemplateInstance(panel.el);

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

let views = [];
let autoMarkings = [];

let nextViewID = 0;

let currentSpeed = 0.0;

function updatePNG() {
    /* Source: https://stackoverflow.com/questions/12255444/copy-svg-images-from-browser-to-clipboard */
    svgAsPngUri(document.getElementById("diagram"), { scale: 8.0 }).then(uri => {
        $("#diagram_png").attr('src', uri).show();
    });
}

// Source: https://stackoverflow.com/questions/6620393/is-it-possible-to-alter-a-css-stylesheet-using-javascript-not-the-style-of-an
function changeStylesheetRule(stylesheet, selector, property, value) {
    // Make the strings lowercase
    selector = selector.toLowerCase();
    property = property.toLowerCase();
    value = value.toLowerCase();

    // Change it if it exists
    for (var i = 0; i < stylesheet.cssRules.length; i++) {
        var rule = stylesheet.cssRules[i];
        if (rule.selectorText === selector) {
            rule.style[property] = value;
            return;
        }
    }

    // Add it if it does not
    stylesheet.insertRule(selector + " { " + property + ": " + value + "; }", 0);
}

$(document).ready(function () {
    debugger;

    // views.push({ el: $("#diagram-view")[0], id: 0, markings: [] });
    // views[0].highlight = { el: $("#diagram-highlight", views[0].el)[0] };
    // views[0].setGlobalSpeed = function(globalBeta) {
    //     this.globalBeta = globalBeta;
    //     for (let presence of this.markings) {
    //         presence.onViewBetaSet(this.globalBeta);
    //     }
    // }
    // views[0].setGlobalSpeed(0);

    // // $("#diagram_png")[0].style.width = `${$("#diagram")[0].clientWidth}px`;
    // // $("#diagram_png")[0].style.height = `${$("#diagram")[0].clientHeight}px`;

    // // updatePNG();
    // AddMarking({ type: "point", x: 10, ct: 30, label: "Cool!" }, views[0]);
    // AddMarking({ type: "point", x: -10, ct: 30, label: "Super cool!" }, views[0]);

    createLayout();

    $(document).ready(function () {
        $('[data-toggle="tooltip"]').tooltip();
    });

    // $("#speedSlider")[0].value = 0;

    // $("#speedSlider").on('input', function () {
    //     //debugger;
    //     //speedDiff = $("#speedSlider")[0].value - currentSpeed;
    //     currentSpeed = $("#speedSlider")[0].value * 1 / 100;

    //     views[1].setSpeed(views[0], currentSpeed);

    //     // for (const id in markings) {
    //     //     markings[id].presences[views[0]]?.setSpeed(currentSpeed);
    //     // }
    //     //console.log(`Speed has been set to ${currentSpeed}`);
    // });

    //createLayout();

    //initColorPicker();
});
