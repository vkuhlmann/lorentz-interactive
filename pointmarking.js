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

function hoverPointEdit(presence) {
    presence.editHover();
}

function openPointEdit(presence, closeOnOtherOpen = false) {

}

class PointMarkingEditPanel extends Panel {
    constructor(presence) {
        super($("#pointEditPanel")[0], presence.view);

        this.presence = presence;
        this.isPinned = false;

        // this.panel.obj = this.presence.controller;
        // this.panel.view = this.presence.view;
        // this.panel.presence = this.presence;

        this.reposition();

        bindElements(this.el, [this, this.presence, this.presence.controller]);

        if (this.presence.bindings["isInPositionView"] == null)
            this.presence.bindings["isInPositionView"] = [];

        const panel = this;
        const inPositionIndicatorUpdate = function() {
            let val = panel.presence["isInPositionView"];
            if (val) {
                $("[data-binding=transformedXFormatted]", panel.el).css("color", "#8B0000");
                $("[data-binding=transformedCtFormatted]", panel.el).css("color", "#8B0000");
                $("[data-binding=transformedXFormatted]", panel.el).css("font-style", "normal");
                $("[data-binding=transformedCtFormatted]", panel.el).css("font-style", "normal");
            } else {
                $("[data-binding=transformedXFormatted]", panel.el).css("color", "gray");
                $("[data-binding=transformedCtFormatted]", panel.el).css("color", "gray");
                $("[data-binding=transformedXFormatted]", panel.el).css("font-style", "oblique");
                $("[data-binding=transformedCtFormatted]", panel.el).css("font-style", "oblique");
            }
        }

        this.presence.bindings["isInPositionView"].push({
            update: inPositionIndicatorUpdate
        });

        inPositionIndicatorUpdate();

        let canceled = !this.view.el.dispatchEvent(new CustomEvent("panelopen",
            {
                bubbles: true,
                detail: {
                    panel: this
                },
                cancelable: true
            }));
        if (canceled) {
            panelClose();
            return false;
        }

        this.onOtherPanelOpen = function () {
            if (!panel.isPinned)
                panel.close();
        }

        this.el.addEventListener("closed", function (e) {
            // if (panel.pickr != null) {
            //     panel.pickr.destroyAndRemove();
            //     panel.pickr = null;
            // }

            if (panel.presence.controller.currentEditPanel === panel)
                panel.presence.controller.currentEditPanel = null;
        });
        this.presence.controller.currentEditPanel = this;
        this.show();

        // let autoCloseFunction = function () {
        //     panel.close();
        //     view.el.removeEventListener("panelopen", autoCloseFunction);
        // }

        this.view.el.addEventListener("panelopen", this.onOtherPanelOpen);
    }

    reposition() {
        this.autoposition(this.presence.el.getBoundingClientRect());
    }

    close() {
        super.close();
    }
}

class PointMarkingPresence {
    constructor(controller, view) {
        let diagramIndications = $("[data-binding=diagram-indications]", view.el)[0];
        let el = createTemplateInstance("template-pointmarker", diagramIndications);

        this.view = view;
        this.el = el;
        this.controller = controller;
        this.bindings = {};
        this.isPinned = false;

        this.view.markings.push(this);
        this.controller.presences.push(this);

        //$("[data-binding=label]", el)[0].innerHTML = obj.label;
        //this.el.id = `view${view.id}_marking${markingID}`;
        markingID += 1;

        this.onViewBetaSet(view.globalBeta);
        this._updateColor();

        const pointmarkerpresence = this;

        const presence = this;
        this.el.addEventListener("pointerover",
            function () {
                presence.editHover(pointmarkerpresence);
            });
        this.el.addEventListener("click",
            function () {
                presence.editOpen(pointmarkerpresence);
            });

        bindElements(el, [this, this.controller]);
        activateTemplateInstance(el);
    };

    editHover() {
        let rect = this.el.getBoundingClientRect();
        let containerRect = this.view.el.getBoundingClientRect();

        let margin = 10;
        this.view.highlight.el.style.left = `${rect.x - containerRect.x - margin}px`;
        this.view.highlight.el.style.top = `${rect.y - containerRect.y - margin}px`;
        this.view.highlight.el.style.width = `${rect.width + 2 * margin}px`;
        this.view.highlight.el.style.height = `${rect.height + 2 * margin}px`;
        this.view.highlight.el.style.display = "block";

        const presence = this;
        this.el.addEventListener("pointerleave", function () {
            presence.view.highlight.el.style.display = "none";
        });
    }

    editOpen() {
        if (this.controller.currentEditPanel == null) {
            new PointMarkingEditPanel(this);
        }
        setTopPanel(this.controller.currentEditPanel);
        return true;
    }

    deletePresence() {
        if (this.currentEditPanel != null)
            this.currentEditPanel.close();

        if (this.el != null)
            this.el.remove();
        this.el = null;

        removeFromArr(this.view.markings, this);
        removeFromArr(this.controller.presences, this);
    }

    rebaseTo() {
        this.controller.rebase(this.view, { x: this.transformedX, ct: this.transformedCt });
    }

    _setPos(x, ct) {
        this.transformedX = x;
        this.transformedCt = ct;

        this.transformedXFormatted = `${this.transformedX.toFixed(2)} cs`;
        this.transformedCtFormatted = `${this.transformedCt.toFixed(2)} s`;
        updateBinding(this, "transformedXFormatted");
        updateBinding(this, "transformedCtFormatted");

        this.isInPositionView = this.controller.positionView === this.view;
        updateBinding(this, "isInPositionView");

        //obj.x = x;
        //obj.ct = ct;
        this.el.setAttribute("transform", `translate(${this.transformedX * this.view.zoom} ${-this.transformedCt * this.view.zoom})`);
    };

    _setColor(c) {
        this.el.style.fill = c;
    }

    _updateColor() {
        this._setColor(this.controller.color.value);
    }

    setTransformedXFormatted(val) {
        if (this.controller.positionView !== this.view)
            this.rebaseTo();
        this.controller.setX(parseFloat(val));
    }

    setTransformedCtFormatted(val) {
        if (this.controller.positionView !== this.view)
            this.rebaseTo();
        this.controller.setCt(parseFloat(val));
    }

    //obj.presences[view].setPos(obj.x, obj.ct);

    onViewBetaSet(beta) {
        this.viewBeta = beta;
        this._recalcPosition();
    }

    updatePosition() {
        this._recalcPosition();
    };

    _recalcPosition() {
        this.baseTransfBeta =
            (this.controller.positionView.globalBeta - this.viewBeta) / (1 - this.controller.positionView.globalBeta * this.viewBeta);

        let beta = this.baseTransfBeta;

        let gamma = Math.sqrt(1 / (1 - (beta * beta)))
        let xTransf = gamma * (this.controller.x + beta * this.controller.ct);
        let ctTransf = gamma * (this.controller.ct + beta * this.controller.x);

        this._setPos(xTransf, ctTransf);
    };
}

function lorentzTransform(targetGlobalBeta, point, sourceGlobalBeta) {
    let x = point.x;
    let ct = point.ct || -point.y;

    let beta =
        (sourceGlobalBeta - targetGlobalBeta) / (1 - sourceGlobalBeta * targetGlobalBeta);

    let gamma = Math.sqrt(1 / (1 - (beta * beta)))
    let xTransf = gamma * (x + beta * ct);
    let ctTransf = gamma * (ct + beta * x);

    let a = new DOMPoint(xTransf, ctTransf);
    a.ct = -ctTransf;
    return a;
}

class PointMarking {
    constructor(obj, positionView) {
        Object.assign(this, obj);
        this.bindings = this.bindings || {};

        this.presences = [];//{};

        if (this.color == null)
            this.color = {};
        if (this.color.value == null)
            this.color.value = "#000";

        this.positionView = positionView;
        this.currentEditPanel = null;

        const controller = this;
        this.onPositionViewSpeedChanged = function () {
            controller._recalcPositions();
        }
        positionView.speedDependencies.push(this.onPositionViewSpeedChanged);

        autoMarkings.push(this);

        for (let v of views) {
            this.addToView(v);
        }
    }

    static create(obj, positionView) {
        new PointMarking(obj, positionView);
    }

    rebase(view, position) {
        if (this.positionView != null)
            removeFromArr(this.positionView.speedDependencies, this.onPositionViewSpeedChanged);

        this.positionView = view;
        this.positionView.speedDependencies.push(this.onPositionViewSpeedChanged);
        this.setPosition(position.x, position.ct);
    }

    setLabel(label) {
        if (label == "sinterklaas")
            throw "Hoofdletters!";
        this.label = label;
        updateBinding(this, "label");
        //$("[data-binding=label]", el)[0].innerHTML = obj.label;
    };

    setX(x) {
        this.setPosition(parseFloat(x), this.ct);
    };

    setCt(ct) {
        this.setPosition(this.x, parseFloat(ct));
    };

    setPosition(x, ct) {
        this.x = x;
        this.ct = ct;
        updateBinding(this, "x");
        updateBinding(this, "ct");
        this._recalcPositions();
    }

    _recalcPositions() {
        for (let pres of this.presences) {
            pres._recalcPosition();
        }
    };

    deleteMarking() {
        if (this.currentEditPanel != null)
            this.currentEditPanel.close();

        removeFromArr(autoMarkings, this);

        while (this.presences.length > 0) {
            this.presences[0].deletePresence();
        }

        removeFromArr(this.positionView.speedDependencies, this.onPositionViewSpeedChanged);
    };

    addToView(view) {
        AddMarkingToView(this, view);
    };

    setColor(color) {
        if (this.color.suppressSet)
            return;
        this.color.suppressSet = true;
        this.color.value = color;
        //$("[data-binding=centerpoint]", obj.el)[0].style.fill = obj.color;
        updateBinding(this, "color");
        this._updateColors();
        delete this.color.suppressSet;
        //obj.el.style.fill = obj.color;
        //obj.el.dispatchEvent(new CustomEvent("colorchanged", { detail: { color: obj.color, obj: obj } }));
    };

    _updateColors() {
        for (let pres of this.presences) {
            pres._updateColor();
        }
    };
}

function AddMarkingToView(obj, view) {
    new PointMarkingPresence(obj, view);
}

function AddMarking(obj, positionView) {
    if (obj.type === "point") {
        new PointMarkingController(obj, positionView);
    }
};
