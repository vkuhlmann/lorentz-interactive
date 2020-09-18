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

class GridPresence {
    constructor(grid, view) {
        this.grid = grid;
        this.lines = [];
        this.view = view;
        this.view.grids.push(this);
        this.keepInvisible = false;
        this.isVisible = false;
        this.spacingFactor = 1;
        this.majorInterval = null;
        this.canonicalZoom = 1.0;

        let grids = $("[data-id=grids]", this.view.el)[0];
        this.el = document.createElementNS("http://www.w3.org/2000/svg", "g");
        grids.appendChild(this.el);

        const gridPresence = this;
        this.grid.baseView.speedDependencies.push(function () {
            gridPresence.recreate();
        });
        this.setVisible(true);
    }

    setSpacingFactor(factor, canonicalZoom) {
        this.spacingFactor = factor;
        this.canonicalZoom = canonicalZoom;
        this.recreate();
    }

    updateVisibility() {
        this.setVisible(this.intentionVisible);
    }

    setVisible(val, forceKeepCurr = false) {
        val = (val === true || val > 0 || (typeof (val) == "string" && val.toLowerCase() == "true"));
        this.intentionVisible = val;

        val = this.intentionVisible && (this.grid.isVisible ||
            (this.grid.overrideMainVisible && this.grid.baseView == this.view));

        if (val == this.isVisible)
            return;
        this.isVisible = val;
        if (this.isVisible || (!forceKeepCurr && !this.keepInvisible))
            this.recreate();

        this.el.style.visibility = this.isVisible ? "visible" : "hidden";
    }

    getVisible() {
        return this.isVisible;
    }

    onViewBetaSet(beta) {
        this.recreate();
    }

    recreate(force = false) {
        this.lines = [];
        while (this.el.hasChildNodes())
            this.el.removeChild(this.el.childNodes[0]);

        if (!this.isVisible && !this.keepInvisible && !force)
            return;
        let transf = this.grid.matrix.scale(this.spacingFactor, this.spacingFactor);

        this.placeSeries(transf)
        this.placeSeries(transf.rotate(0, 0, -90));
    }

    cropInfiniteToBounds(basePoint, dir, bounds) {
        let magnitudes = [[dir.x, bounds.x - basePoint.x, bounds.x + bounds.width - basePoint.x],
        [dir.y, bounds.y - basePoint.y, bounds.y + bounds.height - basePoint.y]];

        let currentMin = -Infinity;
        let currentMax = Infinity;

        magnitudes.sort(function (a, b) {
            return Math.abs(b[0]) - Math.abs(a[0]);
        });

        for (let m of magnitudes) {
            if (m[0] >= 0) {
                if (currentMax * m[0] > m[2])
                    currentMax = m[2] / m[0];

                if (currentMin * m[0] < m[1])
                    currentMin = m[1] / m[0];
            } else {
                if (currentMax * m[0] < m[1])
                    currentMax = m[1] / m[0];

                if (currentMin * m[0] > m[2])
                    currentMin = m[2] / m[0];
            }
        }

        if (currentMax <= currentMin)
            return null;
        else
            return [new DOMPoint(basePoint.x + dir.x * currentMin, basePoint.y + dir.y * currentMin),
            new DOMPoint(basePoint.x + dir.x * currentMax, basePoint.y + dir.y * currentMax)];
    }

    addFiniteLine(posStart, posEnd, style = {}, data = {}) {
        let p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", `M ${posStart.x} ${posStart.y} ${posEnd.x} ${posEnd.y}`);

        Object.assign(p.style, style);

        let strokeWidth = (style.relativeWidth || 1) * (style["stroke-width"] || 0.1);
        p.style.strokeWidth = strokeWidth;

        let dashes = data.dashes || [1, 1.5];
        let dashScale = data.staticDashScale || 1.0;

        if (data.dynamicDashScale == null)
            dashScale *= this.view.zoom / this.canonicalZoom;
        else
            dashScale *= data.dynamicDashScale;

        let dashesString = "";
        for (let dash of dashes)
            dashesString += `${dash * dashScale}px `;
        dashesString = dashesString.trim();

        p.style.strokeDasharray = dashesString;

        let diff = new DOMPoint(posEnd.x - posStart.x, posEnd.y - posStart.y, 0.0, 0.0);
        let lineLength = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
        let direction = new DOMPoint(diff.x / lineLength, diff.y / lineLength);

        let dashPatternLength = 0;
        for (let dash of dashes)
            dashPatternLength += dash * dashScale;
        let dashOffset = (direction.x * posStart.x + direction.y * posStart.y) % dashPatternLength;
        //let dashOffset = (posStart.x + posStart.y) % dashPatternLength;
        p.style.strokeDashoffset = `${dashOffset}px`;

        // if (i == 999)
        //     p.style.stroke = "red";

        this.el.appendChild(p);
        let obj = { el: p, ...data };
        this.lines.push(obj);
        return obj;
    }

    addInfiniteLine(basePoint, dir, bounds, style = {}, data = {}) {
        let pos = this.cropInfiniteToBounds(basePoint, dir, bounds);
        if (pos === null)
            return null;
        let [posStart, posEnd] = pos;
        data["infDir"] = dir;
        data["infCropBounds"] = bounds;
        return this.addFiniteLine(posStart, posEnd, style, data);
    }

    getLineStyle(pos, style) {
        let obj = {};
        Object.assign(obj, this.grid.gridLineStyle);
        Object.assign(obj, style);
        obj.relativeWidth = 1.0;
        if ((pos % (this.majorInterval || this.grid.majorInterval)) == 0) {
            obj.relativeWidth = 3;
            obj["stroke"] = "red";
        }
        return obj;
    }

    placeSeries(transf) {
        let boundRect = this.view.coordinatePlaced.getCurrentViewBounds();

        let thisView = this.view;
        let otherView = views[0];

        let dirX = lorentzTransform(thisView.globalBeta, new DOMPoint(1.0, 0.0).matrixTransform(transf), otherView.globalBeta);
        let dirY = lorentzTransform(thisView.globalBeta, new DOMPoint(0.0, 1.0).matrixTransform(transf), otherView.globalBeta);
        dirX = new DOMPoint(dirX.x, dirX.y, 0.0, 0.0);
        dirY = new DOMPoint(dirY.x / Math.sqrt(dirY.x * dirY.x + dirY.y * dirY.y),
            dirY.y / Math.sqrt(dirY.x * dirY.x + dirY.y * dirY.y), 0.0, 0.0);

        let startOnTop = true;// dirX.x * dirX.y >= 0;
        let startOnLeft = startOnTop != (dirY.y * dirY.x >= 0);

        let logicalStartPoint = new DOMPoint(
            startOnLeft ? boundRect.x : boundRect.x + boundRect.width,
            startOnTop ? boundRect.y : boundRect.y + boundRect.height);

        let parComp = dirX.x * dirY.x + dirX.y * dirY.y;
        let orthDir = new DOMPoint(dirX.x - parComp * dirY.x, dirX.y - parComp * dirY.y);

        let flipDirX = (logicalStartPoint.x - (boundRect.x + boundRect.width / 2)) * orthDir.x +
            (logicalStartPoint.y - (boundRect.y + boundRect.height / 2)) * orthDir.y > 0;

        if (flipDirX)
            dirX = dirX.matrixTransform(new DOMMatrix().scale(-1, -1));

        let dirXLength = Math.sqrt(dirX.x * dirX.x + dirX.y * dirX.y);

        logicalStartPoint = lorentzTransform(otherView.globalBeta, logicalStartPoint, thisView.globalBeta);
        logicalStartPoint = logicalStartPoint.matrixTransform(transf.inverse());
        let logicalStartX = Math.floor(logicalStartPoint.x);
        let logicalStartY = Math.floor(logicalStartPoint.y);

        let start = new DOMPoint(logicalStartX, logicalStartY).matrixTransform(transf);
        start = lorentzTransform(thisView.globalBeta, start, otherView.globalBeta);

        for (let i = 0; i < 1000; i++) {
            let basePoint = new DOMPoint(start.x + dirX.x * i, start.y + dirX.y * i);
            let placingTransf = new DOMMatrix().scaleSelf(this.view.zoom, this.view.zoom);
            let boundTopLeft = new DOMPoint(boundRect.x, boundRect.y).matrixTransform(placingTransf);
            let boundWidthHeight = new DOMPoint(boundRect.width, boundRect.height, 0.0, 0.0).matrixTransform(placingTransf);

            let style = {};

            let res = this.addInfiniteLine(basePoint.matrixTransform(placingTransf), dirY.matrixTransform(placingTransf),
                new DOMRect(boundTopLeft.x, boundTopLeft.y, boundWidthHeight.x, boundWidthHeight.y),
                this.getLineStyle(logicalStartX + i * (flipDirX ? -1 : 1), style), {});
            if (res === null) {
                if (i < 1)
                    continue;
                else
                    break;
            }
        }
    }
}

class Grid {
    constructor(baseView) {
        this.baseView = baseView;
        this.matrix = new DOMMatrix().scaleSelf(10, 10);
        this.presences = [];
        this.isVisible = true;
        this.overrideMainVisible = true;
        this.gridLineStyle = {};
        this.rotation = 0;
        this.spacing = 10;
        this.majorInterval = 5;

        this.gridLineStyle["stroke-width"] = 0.1;
        // this.gridLineStyle.dashes = [1, 1.5];
        // this.gridLineStyle["stroke"] = "red";

        autoGrids.push(this);
        for (let v of views) {
            this.addToView(v);
        }
    }

    updateMatrix() {
        this.setMatrix(new DOMMatrix().rotateSelf(this.rotation)
            .scaleSelf(this.spacing, this.spacing));
    }

    setMatrix(mat) {
        this.matrix = DOMMatrix.fromMatrix(mat);
        for (let pres of this.presences) {
            pres.recreate();
        }
    }

    setGlobalSpacing() {
        this.spacing = spacing;
        this.updateMatrix();
    }

    setViewSpacing(spacing, canonicalZoom, view) {
        if (view == null)
            return;
        for (let pres of this.presences) {
            if (pres.view !== view)
                continue;

            pres.setSpacingFactor(spacing, canonicalZoom);
            break;
        }
    }

    setRotation(rot) {
        this.rotation = rot;
        this.updateMatrix();
    }

    setVisible(val = true, mainVisible = true) {
        this.isVisible = val;
        this.overrideMainVisible = mainVisible;
        for (let pres of this.presences) {
            pres.updateVisibility();
        }
    }

    addToView(view) {
        this.presences.push(new GridPresence(this, view));
    }
}
