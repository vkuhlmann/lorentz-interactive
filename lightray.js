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

class LightRayEditPanel extends Panel {
    constructor(presence) {
        super($("#lightRayEditPanel")[0], presence.view);

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
        //this.reposition();

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

class LightRayPresence {
    constructor(controller, view) {
        this.view = view;
        let diagramIndications = $("[data-binding=diagram-indications]", this.view.el)[0];
        this.el = createTemplateInstance("template-lightray", diagramIndications);

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

        const presence = this;

        this.onViewBetaSet(view.globalBeta);
        this._updateColor();

        this.el.addEventListener("pointerover",
            function () {
                presence.editHover();
            });
        this.el.addEventListener("click",
            function () {
                presence.editOpen();
            });

        bindElements(this.el, [this, this.controller]);
        this.controller.bindings["label"] = this.controller.bindings["label"] || [];
        this.controller.bindings["label"].push({
            update: function () {
                presence.repositionLabel();
            }
        });

        activateTemplateInstance(this.el);
        this.repositionLabel();
    };

    repositionLabel() {
        // $("[data-binding=centerpoint]", this.el)[0].setAttribute("cx", this.barycenter.x);
        // $("[data-binding=centerpoint]", this.el)[0].setAttribute("cy", this.barycenter.y);

        let labelBox = this.labelElement.el.getBBox();
        let labelPlacePos = new DOMPoint(this.barycenter.x - labelBox.width / 2, this.barycenter.y)
            .matrixTransform(new DOMMatrix().scaleSelf(this.zoom, this.zoom));

        this.labelElement.el.setAttribute("x", `${labelPlacePos.x.toFixed(2)}`);
        this.labelElement.el.setAttribute("y", `${labelPlacePos.y.toFixed(2)}`);
    }

    editHover() {
        let rect = this.el.getBoundingClientRect();
        let containerRect = this.view.el.getBoundingClientRect();

        let intersectRect = getRectanglesIntersection(rect, containerRect);

        let margin = 10;
        this.view.highlight.el.style.left = `${intersectRect.x - containerRect.x - margin}px`;
        this.view.highlight.el.style.top = `${intersectRect.y - containerRect.y - margin}px`;
        this.view.highlight.el.style.width = `${intersectRect.width + 2 * margin}px`;
        this.view.highlight.el.style.height = `${intersectRect.height + 2 * margin}px`;
        this.view.highlight.el.style.display = "block";

        const presence = this;
        this.el.addEventListener("pointerleave", function () {
            presence.view.highlight.el.style.display = "none";
        });
    }

    editOpen() {
        if (this.controller.currentEditPanel == null) {
            new LightRayEditPanel(this);
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

        this.barycenter = { x: 0, y: 0 };
        for (let p of this.transformedPoints) {
            this.barycenter.x += p.x;
            this.barycenter.y += p.y;
        }
        this.barycenter.x /= this.transformedPoints.length;
        this.barycenter.y /= this.transformedPoints.length;

        this.barycenter.x *= this.view.zoom;
        this.barycenter.y *= this.view.zoom;

        this.shapeString = "M ";
        for (let p of this.transformedPoints)
            this.shapeString += `${(p.x * this.view.zoom).toFixed(2)} ${(p.y * this.view.zoom).toFixed(2)} `;
        this.shape.el.setAttribute("d", this.shapeString);

        this.repositionLabel();
    }

    _setColor(c) {
        this.el.style.fill = c;
        this.el.style.stroke = c;
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


class LightRay {
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

        this.setStart(this.startX || 0, this.startCt || 10);

        for (let v of views) {
            this.addToView(v);
        }
        this.suppressSet = false;

        //this.setStart(this.minX, this.maxX, this.minCt, this.maxCt);
    }

    static create(obj, positionView) {
        new LightRay(obj, positionView);
    }

    setLabel(label) {
        this.label = label;
        updateBinding(this, "label");
    };

    setStartX(x) {
        this.setStart(parseFloat(x), this.startCt);
    };

    setStartCt(ct) {
        this.setStart(this.startX, parseFloat(ct));
    };

    setStartXFormatted(ct) {
        this.setStartX(parseFloat(ct));
    };

    setStartCtFormatted(ct) {
        this.setStartCt(parseFloat(ct));
    };

    updateTrajectory() {
        this.setStart(this.startX, this.startCt)
    }

    setStart(startX, startCt) {
        this.startX = startX;
        this.startCt = startCt;

        this.startXFormatted = formatSpaceUnit(this.startX); //`${this.startX.toFixed(2)} cs`;
        this.startCtFormatted = formatSpaceUnit(this.startCt); //`${this.startCt.toFixed(2)} cs`;

        this.startPoint = new DOMPoint(this.startX, -this.startCt);

        this.points = [];//this.startPoint];
        let currentSpeed = -1.0;
        let currentPoint = this.startPoint;

        let collisionWaitDuration = 0;
        while (collisionWaitDuration < Infinity) {
            currentPoint = currentPoint.matrixTransform(new DOMMatrix().translateSelf(collisionWaitDuration * currentSpeed, -collisionWaitDuration));
            this.points.push(currentPoint);
            currentSpeed = -currentSpeed;

            collisionWaitDuration = Infinity;
            for (let r of this.positionView.markings) {
                if (!(r instanceof RectanglePresence))
                    continue;
                let transformedPoint = lorentzTransform(r.controller.positionView.globalBeta, currentPoint, this.positionView.globalBeta);
                let collideX = r.controller.minX;
                if (currentSpeed < 0)
                    collideX = r.controller.maxX;

                let collideTime = (collideX - transformedPoint.x) / currentSpeed - transformedPoint.y;
                if (collideTime >= r.controller.minCt && collideTime <= r.controller.maxCt) {
                    let backTransformed = lorentzTransform(this.positionView.globalBeta, new DOMPoint(collideX, -collideTime),
                        r.controller.positionView.globalBeta);

                    let dur = -backTransformed.y + currentPoint.y;
                    if (dur > Number.EPSILON && dur < collisionWaitDuration) {
                        collisionWaitDuration = dur;
                    }
                }
            }
        }

        collisionWaitDuration = Math.min(collisionWaitDuration, 1000);
        this.points.push(currentPoint.matrixTransform(new DOMMatrix().translateSelf(collisionWaitDuration * currentSpeed, -collisionWaitDuration)));

        updateBinding(this, "startX");
        updateBinding(this, "startCt");

        updateBinding(this, "startXFormatted");
        updateBinding(this, "startCtFormatted");
        this._recalcPositions();
    }

    _recalcPositions() {
        for (let pres of this.presences) {
            pres.updatePosition();
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
        new LightRayPresence(this, view);
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
