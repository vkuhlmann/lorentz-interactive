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
            new RectangleEditPanel(this);
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

        let viewRect = this.view.coordinatePlaced.getCurrentViewBounds();

        // this.barycenter = { x: 0, y: 0 };
        // for (let i = 0; i < this.transformedPoints.length; i++) {
        //     this.barycenter.x += this.transformedPoints[i].x;
        // }

        let pointsY = [];
        for (let p of this.transformedPoints) {
            pointsY.push(p.y);
        }
        pointsY.sort((a, b) => { a - b });
        if (pointsY[1] > pointsY[2]) {
            pointsY = pointsY;
        }

        let minY = Math.max(pointsY[1], viewRect.y);
        let maxY = Math.min(pointsY[2], viewRect.y + viewRect.height);
        let placeY = (maxY + minY) / 2;
        let placeXLeft = this.transformedPoints[3].x;
        let placeXRight = this.transformedPoints[2].x;

        if (Math.abs(this.transformedPoints[0].y - this.transformedPoints[3].y) > 1e-4) {
            placeXLeft += (placeY - this.transformedPoints[3].y) /
                (this.transformedPoints[0].y - this.transformedPoints[3].y)
                * (this.transformedPoints[0].x - this.transformedPoints[3].x);
        }

        if (Math.abs(this.transformedPoints[1].y - this.transformedPoints[2].y))
            placeXRight += (placeY - this.transformedPoints[2].y) /
                (this.transformedPoints[1].y - this.transformedPoints[2].y)
                * (this.transformedPoints[1].x - this.transformedPoints[2].x);
        this.barycenter = new DOMPoint((placeXLeft + placeXRight) / 2, placeY);

        // for (let p of this.transformedPoints) {
        //     this.barycenter.x += p.x;
        //     this.barycenter.y -= p.ct;
        // }
        // this.barycenter.x /= this.transformedPoints.length;
        // this.barycenter.y /= this.transformedPoints.length;

        this.barycenter.x *= this.view.zoom;
        this.barycenter.y *= this.view.zoom;

        this.shapeString = "M ";
        for (let p of this.transformedPoints)
            this.shapeString += `${(p.x * this.view.zoom).toFixed(2)} ${(-p.ct * this.view.zoom).toFixed(2)} `;
        this.shapeString += "Z";
        this.shape.el.setAttribute("d", this.shapeString);

        if (Math.abs(this.controller.maxX - this.controller.minX) < 1e-2)
            this.shape.el.style.strokeWidth = 1;
        else
            this.shape.el.style.strokeWidth = 0;

        this.repositionLabel();

        for (let m of this.view.markings) {
            if (!(m instanceof LightRayPresence))
                continue;
            m.controller.updateTrajectory();
        }

        if (isFinite(this.transformedPoints[0].x))
            this.el.style.visibility = "visible";
        else
            this.el.style.visibility = "hidden";
    }

    _setColor(c) {
        this.el.style.fill = c;
        this.shape.el.style.stroke = c;
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
        this.suppressSet = false;

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

    setMinXFormatted(x) {
        let parsed = parseFloat(x);
        let minXIntention = isNaN(parsed) ? this.minX : parsed;
        let maxXIntention = this.maxXIntention || this.maxX;
        this.minXIntention = null;
        this.maxXIntention = null;

        this.setPosition(minXIntention, maxXIntention, this.minCt, this.maxCt);
    };
    setMinXFormattedLive(x) {
        let parsed = parseFloat(x);
        this.minXIntention = isNaN(parsed) ? this.minX : parsed;
        this.maxXIntention = this.maxXIntention || this.maxX;
        this.setPosition(this.minXIntention, this.maxXIntention, this.minCt, this.maxCt);
    };

    setMaxXFormatted(x) {
        let parsed = parseFloat(x);

        let minXIntention = this.minXIntention || this.minX;
        let maxXIntention = isNaN(parsed) ? this.maxX : parsed;
        this.minXIntention = null;
        this.maxXIntention = null;

        this.setPosition(minXIntention, maxXIntention, this.minCt, this.maxCt);
    };
    setMaxXFormattedLive(x) {
        let parsed = parseFloat(x);

        this.minXIntention = this.minXIntention || this.minX;
        this.maxXIntention = isNaN(parsed) ? this.maxX : parsed;
        this.setPosition(this.minXIntention, this.maxXIntention, this.minCt, this.maxCt);
    };

    // setMinCtFormatted(ct) {
    //     this.setMinCt(parseFloat(ct));
    // };

    // setMaxCtFormatted(ct) {
    //     this.setMaxCt(parseFloat(ct));
    // };

    setMinCtFormatted(ct) {
        let parsed = parseFloat(ct);

        let minCtIntention = isNaN(parsed) ? this.minCt : parsed;
        let maxCtIntention = this.maxCtIntention || this.maxCt;
        this.minCtIntention = null;
        this.maxCtIntention = null;

        this.setPosition(this.minX, this.maxX, minCtIntention, maxCtIntention);
    };
    setMinCtFormattedLive(ct) {
        let parsed = parseFloat(ct);

        this.minCtIntention = isNaN(parsed) ? this.mint : parsed;
        this.maxCtIntention = this.maxCtIntention || this.maxCt;
        this.setPosition(this.minX, this.maxX, this.minCtIntention, this.maxCtIntention);
    };

    setMaxCtFormatted(ct) {
        let parsed = parseFloat(ct);

        let minCtIntention = this.minCtIntention || this.minCt;
        let maxCtIntention = isNaN(parsed) ? this.maxCt : parsed;
        this.minCtIntention = null;
        this.maxCtIntention = null;

        this.setPosition(this.minX, this.maxX, minCtIntention, maxCtIntention);
    };
    setMaxCtFormattedLive(ct) {
        let parsed = parseFloat(ct);

        this.minCtIntention = this.minCtIntention || this.minCt;
        this.maxCtIntention = isNaN(parsed) ? this.maxCt : parsed;
        this.setPosition(this.minX, this.maxX, this.minCtIntention, this.maxCtIntention);
    };

    setPosition(minX, maxX, minCt, maxCt) {
        this.minX = Math.min(minX, maxX);
        this.maxX = Math.max(minX, maxX);
        this.minCt = Math.min(minCt, maxCt);
        this.maxCt = Math.max(minCt, maxCt);

        // this.minXFormatted = `${(this.minXIntention ?? this.minX).toFixed(2)} cs`;
        // this.maxXFormatted = `${(this.maxXIntention ?? this.maxX).toFixed(2)} cs`;
        // this.minCtFormatted = `${(this.minCtIntention ?? this.minCt).toFixed(2)} cs`;
        // this.maxCtFormatted = `${(this.maxCtIntention ?? this.maxCt).toFixed(2)} cs`;

        this.minXFormatted = formatSpaceUnit(this.minXIntention ?? this.minX);
        this.maxXFormatted = formatSpaceUnit(this.maxXIntention ?? this.maxX);
        this.minCtFormatted = formatSpaceUnit(this.minCtIntention ?? this.minCt);
        this.maxCtFormatted = formatSpaceUnit(this.maxCtIntention ?? this.maxCt);

        this.pointTopLeft = new DOMPoint(this.minX, -this.maxCt);
        this.pointTopRight = new DOMPoint(this.maxX, -this.maxCt);
        this.pointBottomLeft = new DOMPoint(this.minX, -this.minCt);
        this.pointBottomRight = new DOMPoint(this.maxX, -this.minCt);
        this.points = [this.pointTopLeft, this.pointTopRight,
        this.pointBottomRight, this.pointBottomLeft];

        updateBinding(this, "minX");
        updateBinding(this, "maxX");
        updateBinding(this, "minCt");
        updateBinding(this, "maxCt");

        updateBinding(this, "minXFormatted");
        updateBinding(this, "maxXFormatted");
        updateBinding(this, "minCtFormatted");
        updateBinding(this, "maxCtFormatted");
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
