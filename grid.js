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

class Grid {
    constructor(view) {
        this.matrix = new DOMMatrix().scaleSelf(10, 10);
        this.lines = [];
        this.view = view;
        this.view.grids.push(this);

        let grids = $("[data-id=grids]", view.el)[0];
        this.el = document.createElementNS("http://www.w3.org/2000/svg", "g");
        grids.appendChild(this.el);

        this.recreate();
    }

    onViewBetaSet() {
        this.recreate();
    }

    recreate() {
        this.lines = [];
        while (this.el.hasChildNodes())
            this.el.removeChild(this.el.childNodes[0]);
        this.fillBetween();

        let origMatrix = this.matrix;
        let rotatedMatrix = origMatrix.rotate(0, 0, -90);
        this.matrix = rotatedMatrix;
        this.fillBetween();

        this.matrix = origMatrix;
    }

    fillBetween() {
        //let boundRectClient = this.view.coordinatePlaced.getBBox();
        let boundRect = this.view.coordinatePlaced.getCurrentViewBounds();

        let transf = this.matrix;
        let dirX = lorentzTransform(this.view.globalBeta, new DOMPoint(1.0, 0.0).matrixTransform(transf), views[0].globalBeta);
        let dirY = lorentzTransform(this.view.globalBeta, new DOMPoint(0.0, 1.0).matrixTransform(transf), views[0].globalBeta);

        const grid = this;
        views[0].speedDependencies.push(function () {
            grid.onViewBetaSet();
        });

        let logicalStartPoint = new DOMPoint(boundRect.x, boundRect.y).matrixTransform(transf.inverse());
        let logicalStartX = Math.floor(logicalStartPoint.x);
        let logicalStartY = Math.floor(logicalStartPoint.y);

        let start = new DOMPoint(logicalStartX, logicalStartY).matrixTransform(transf);

        let i = 0;
        while (true) {
            let basePoint = new DOMPoint(start.x + dirX.x * i, start.y + dirX.y * i);
            let magnitudes = [[dirY.x, boundRect.x - basePoint.x, boundRect.x + boundRect.width - basePoint.x],
            [dirY.y, boundRect.y - basePoint.y, boundRect.y + boundRect.height - basePoint.y]];
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

            if (currentMax <= currentMin) {
                i += 1;
                if (i <= 2)
                    continue;
                else
                    break;
            }

            let p = document.createElementNS("http://www.w3.org/2000/svg", "path");
            p.setAttribute("d", `M ${basePoint.x + currentMin * dirY.x} ${basePoint.y + currentMin * dirY.y} `
                + `${basePoint.x + currentMax * dirY.x} ${basePoint.y + currentMax * dirY.y}`);
            p.style.strokeWidth = 0.1;
            p.style.strokeDasharray = "2 3";
            //p.style.stroke = "red";
            this.lines.push({ el: p, basePoint: basePoint, dirX: dirX, dirY: dirY });
            this.el.appendChild(p);
            i += 1;
        }

        // for (let v = minVal; v < maxVal; v += (maxVal - minVal) / 10) {
        //     let p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        //     let vec = {x: 4, y: 2};


        //     p.setAttribute("d", `M ${v} 0 v 100`);
        //     p.style.strokeWidth = 0.6;
        //     //p.style.stroke = "red";
        //     this.lines.push({el:p, x: v});
        //     this.el.appendChild(p);
        // }
    }
}
