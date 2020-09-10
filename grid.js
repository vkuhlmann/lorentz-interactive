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

        let grids = $("[data-id=grids]", view.el)[0];
        this.el = document.createElementNS("http://www.w3.org/2000/svg", "g");
        grids.appendChild(this.el);
        
        this.fillBetween(0, 100);
    }

    fillBetween(minVal, maxVal) {
        //let boundRectClient = this.view.coordinatePlaced.getBBox();

        for (let v = minVal; v < maxVal; v += (maxVal - minVal) / 10) {
            let p = document.createElementNS("http://www.w3.org/2000/svg", "path");
            let vec = {x: 4, y: 2};


            p.setAttribute("d", `M ${v} 0 v 100`);
            p.style.strokeWidth = 0.6;
            //p.style.stroke = "red";
            this.lines.push({el:p, x: v});
            this.el.appendChild(p);
        }
    }
}
