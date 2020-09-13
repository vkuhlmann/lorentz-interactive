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

let views = [];
let autoMarkings = [];
let autoGrids = [];

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
    //debugger;

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
