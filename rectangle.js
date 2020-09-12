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

class RectangleEditPanel extends Panel {
    constructor(presence) {
        super($("#rectangleEditPanel")[0], presence.view);

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
        const inPositionIndicatorUpdate = function () {
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

class RectanglePresence {
    constructor(controller, view) {
        this.view = view;
        let diagramIndications = $("[data-binding=diagram-indications]", this.view.el)[0];
        this.el = createTemplateInstance("template-rectangle", diagramIndications);

        this.shape = { el: $("[data-id=shape]", this.el)[0] };
        this.labelElement = { el: $("[data-id=label]", this.el)[0] };

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

        bindElements(this.el, [this, this.controller]);
        activateTemplateInstance(this.el);
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

    // rebaseTo() {
    //     this.controller.rebase(this.view, { x: this.transformedX, ct: this.transformedCt });
    // }

    // _setPos(x, ct) {
    //     this.transformedX = x;
    //     this.transformedCt = ct;

    //     this.transformedXFormatted = `${this.transformedX.toFixed(2)} cs`;
    //     this.transformedCtFormatted = `${this.transformedCt.toFixed(2)} s`;
    //     // updateBinding(this, "transformedXFormatted");
    //     // updateBinding(this, "transformedCtFormatted");

    //     this.isInPositionView = this.controller.positionView === this.view;
    //     updateBinding(this, "isInPositionView");

    //     //obj.x = x;
    //     //obj.ct = ct;
    //     this.el.setAttribute("transform", `translate(${this.transformedX * this.view.zoom} ${-this.transformedCt * this.view.zoom})`);
    // };

    updatePosition() {
        this.transformedPoints = [];
        for (let p of this.controller.points)
            this.transformedPoints.push(lorentzTransform(this.view.globalBeta, p, this.controller.positionView.globalBeta));

        this.baryCenter = { x: 0, y: 0 };
        for (let p of this.transformedPoints) {
            this.baryCenter.x += p.x;
            this.baryCenter.y -= p.ct;
        }
        this.baryCenter.x /= this.transformedPoints.length;
        this.baryCenter.y /= this.transformedPoints.length;

        this.shapeString = "M ";
        for (let p of this.transformedPoints)
            this.shapeString += `${(p.x * this.view.zoom).toFixed(2)} ${(-p.ct * this.view.zoom).toFixed(2)} `;
        this.shapeString += "Z";
        this.shape.el.setAttribute("d", this.shapeString);

        this.labelElement.el.setAttribute("transform", `translate(${this.baryCenter.x * this.view.zoom} ${this.baryCenter.y * this.view.zoom})`);
    }

    _setColor(c) {
        this.el.style.fill = c;
    }

    _updateColor() {
        this._setColor(this.controller.color.value);
    }

    // setTransformedXFormatted(val) {
    //     if (this.controller.positionView !== this.view)
    //         this.rebaseTo();
    //     this.controller.setX(parseFloat(val));
    // }

    // setTransformedCtFormatted(val) {
    //     if (this.controller.positionView !== this.view)
    //         this.rebaseTo();
    //     this.controller.setCt(parseFloat(val));
    // }

    //obj.presences[view].setPos(obj.x, obj.ct);

    onViewBetaSet(beta) {
        this.viewBeta = beta;
        //this._recalcPosition();
        this.updatePosition();
    }

    // updatePosition() {
    //     this._recalcPosition();
    // };

    // _recalcPosition() {
    //     this.baseTransfBeta =
    //         (this.controller.positionView.globalBeta - this.viewBeta) / (1 - this.controller.positionView.globalBeta * this.viewBeta);

    //     let beta = this.baseTransfBeta;

    //     let gamma = Math.sqrt(1 / (1 - (beta * beta)))
    //     let xTransf = gamma * (this.controller.x + beta * this.controller.ct);
    //     let ctTransf = gamma * (this.controller.ct + beta * this.controller.x);

    //     this._setPos(xTransf, ctTransf);
    // };
}


class Rectangle {
    constructor(obj, positionView) {
        Object.assign(this, obj);
        this.bindings = this.bindings || {};

        this.presences = [];

        this.color = this.color || {};
        this.color.value = this.color.value || positionView.color;

        this.positionView = positionView;
        this.currentEditPanel = null;

        const controller = this;
        this.onPositionViewSpeedChanged = function () {
            controller._recalcPositions();
        }
        positionView.speedDependencies.push(this.onPositionViewSpeedChanged);

        autoMarkings.push(this);

        this.setPosition(this.minX, this.maxX, this.minCt, this.maxCt);

        for (let v of views) {
            this.addToView(v);
        }

        //this.setPosition(this.minX, this.maxX, this.minCt, this.maxCt);
    }

    static create(obj, positionView) {
        new Rectangle(obj, positionView);
    }

    setLabel(label) {
        this.label = label;
        updateBinding(this, "label");
    };

    setMinX(x) {
        this.setPosition(parseFloat(x), this.maxX, this.minCt, this.maxCt);
    };

    setMaxX(x) {
        this.setPosition(this.minX, parseFloat(x), this.minCt, this.maxCt);
    };

    setMinCt(ct) {
        this.setPosition(this.minX, this.maxX, parseFloat(ct), this.maxCt);
    };

    setMaxCt(ct) {
        this.setPosition(this.minX, this.maxX, this.minCt, parseFloat(ct));
    };

    setPosition(minX, maxX, minCt, maxCt) {
        this.minX = minX;
        this.maxX = maxX;
        this.minCt = minCt;
        this.maxCt = maxCt;

        this.pointTopLeft = new DOMPoint(minX, -maxCt);
        this.pointTopRight = new DOMPoint(maxX, -maxCt);
        this.pointBottomLeft = new DOMPoint(minX, -minCt);
        this.pointBottomRight = new DOMPoint(maxX, -minCt);
        this.points = [this.pointTopLeft, this.pointTopRight,
        this.pointBottomLeft, this.pointBottomRight];

        updateBinding(this, "minX");
        updateBinding(this, "maxX");
        updateBinding(this, "minCt");
        updateBinding(this, "maxCt");
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
        new RectanglePresence(this, view);
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
