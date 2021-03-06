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

let instantiationIndex = 0;

function createTemplateInstance(template, container, activeOnAdd = false) {
    let el;
    if (typeof (template) == "string") {
        el = $(`#${template}`)[0].cloneNode(true);
    } else {
        el = template.cloneNode(true);
    }

    let modifyNodes = $("[id]", el).toArray();
    if (el.hasAttribute("id"))
        modifyNodes.push(el);

    for (let modifyNode of modifyNodes) {
        let origID = modifyNode.getAttribute("id");
        modifyNode.setAttribute("data-id", origID);
        let newID = origID + "-" + instantiationIndex.toString();
        instantiationIndex += 1;
        modifyNode.setAttribute("id", newID);
        modifyNode.id = newID;

        $(`[marker-end=\"url(#${origID})\"]`).attr("marker-end", `url(#${newID})`);
        $(`[href=\"#${origID}\"]`).attr("href", `#${newID}`);
    }

    if (!activeOnAdd)
        el.classList.add("template-staging");
    el.classList.remove("template");
    if (container != null)
        container.appendChild(el);
    return el;
}

function activateTemplateInstance(el) {
    el.classList.remove("template-staging");
}

function formatSpaceUnit(u) {
    return `${u.toFixed(2)} s \u22C5 c`;
}

let cards = [];

function createDiagramCard(obj = {}) {
    let diagramView = {
        el: createTemplateInstance("diagram-view", null, true), markings: [],
        zoom: 1.0, panOffset: { x: 0, y: 0 }, grids: []
    };
    Object.assign(diagramView, obj);

    diagramView.highlight = { el: $("[data-id=diagram-highlight]", diagramView.el)[0] };

    diagramView._speedRelRef = undefined;
    diagramView._speedRel = 0;
    diagramView.speedDependencies = [];
    diagramView.colorHSL = diagramView.colorHSL || getNextColor() || [0, 0.0, 0.2];
    diagramView.color = `hsl(${diagramView.colorHSL[0]} ${(diagramView.colorHSL[1] * 100).toFixed(1)}% ${(diagramView.colorHSL[2] * 100).toFixed(1)}%)`;

    diagramView.svgElem = { el: $("svg[data-id=\"diagram\"]", diagramView.el)[0] };
    diagramView.svgIndications = { el: $("[data-binding=\"diagram-indications\"]", diagramView.svgElem.el)[0] };
    diagramView.coordinatePlaced = { el: $("[data-id=\"coordinatePlaced\"]", diagramView.svgElem.el)[0] };
    diagramView.el.style.border = `2px solid ${diagramView.color}`;
    diagramView.el.style.borderRadius = `0.5rem`;
    //diagramView.el.style.overflow = "hidden";

    diagramView.coordinatePlaced.toClientSpace = function (p) {
        return DOMPoint.fromPoint(p).matrixTransform(new DOMMatrix().scaleSelf(diagramView.zoom, diagramView.zoom).preMultiplySelf(diagramView.svgIndications.el.getScreenCTM()));
    };

    diagramView.coordinatePlaced.toSVGSpace = function (p) {
        let domMat = new DOMMatrix().scaleSelf(diagramView.zoom, diagramView.zoom).preMultiplySelf(diagramView.svgIndications.el.getScreenCTM())
        domMat.invertSelf();
        return DOMPoint.fromPoint(p).matrixTransform(domMat);
    };

    diagramView.coordinatePlaced.getCurrentViewBounds = function () {
        let rect = diagramView.svgElem.el.getBoundingClientRect();//.getBBox();
        let a = new DOMPoint(rect.x, rect.y);
        let b = new DOMPoint(rect.x + rect.width, rect.y + rect.height);
        let transf = new DOMMatrix();//diagramView.svgElem.el.getCTM().invertSelf();
        transf = transf.preMultiplySelf(new DOMMatrix().scaleSelf(diagramView.zoom, diagramView.zoom));
        transf = transf.preMultiplySelf(diagramView.svgIndications.el.getScreenCTM()).invertSelf();
        a = a.matrixTransform(transf);
        b = b.matrixTransform(transf);

        return new DOMRect(Math.min(a.x, b.x), Math.min(a.y, b.y),
            Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    };

    diagramView.pannableContent = { el: $("[data-id=\"pannableContent\"]", diagramView.svgElem.el)[0] };
    diagramView.pannableContent.setTranslation = function (x, y) {
        diagramView.pannableContent.el.setAttribute("transform", `translate(${x} ${y})`);
    };

    diagramView.canBaseOn = function (relView) {
        if (this._speedRelRef === null && relView !== this)
            return true;
        let b = relView;
        while (b !== null && b !== this) {
            b = b._speedRelRef;
        }
        return b === null;
    };

    diagramView.svgIndications.addMouseEventListener = function (name, func) {
        diagramView.svgElem.el.addEventListener(name, function (ev) {
            return func(ev, diagramView.coordinatePlaced.toSVGSpace({ x: ev.clientX, y: ev.clientY }));
        }, true);
    };

    diagramView.setSpeed = function (relView, relSpeed = null) {
        if (relView !== this._speedRelRef) {
            if (this._speedRelRef === null && relView !== null)
                relView.setSpeed(null);

            if (!diagramView.canBaseOn(relView))
                throw "Rebase would imply circular reference.";
            for (let lowerDep in this._speedRelRef?.speedDependencies) {
                if (this._speedRelRef.speedDependencies[lowerDep] == this) {
                    this._speedRelRef.speedDependencies.splice(lowerDep, 1);
                    break;
                }
            }

            this._speedRelRef = relView;
            if (this._speedRelRef != null)
                this._speedRelRef.speedDependencies.push(this);
        }

        if (relView === null)
            relSpeed = 0;

        if (relSpeed === null)
            relSpeed = (relView.globalBeta - this.globalBeta) / (1 - relView.globalBeta * this.globalBeta);

        this._speedRel = parseFloat(relSpeed);
        this.updateSpeed();
    };

    diagramView.updateSpeed = function () {
        if (this._speedRelRef != null)
            this.globalBeta = (this._speedRel + this._speedRelRef.globalBeta) / (1 + this._speedRel * this._speedRelRef.globalBeta);
        else
            this.globalBeta = this._speedRel;

        for (let presence of this.markings) {
            presence.onViewBetaSet(this.globalBeta);
        }
        for (let grid of this.grids) {
            grid.onViewBetaSet(this.globalBeta);
        }

        for (let dep of this.speedDependencies) {
            if (dep instanceof Function) {
                dep();
            } else {
                dep.updateSpeed();
            }
        }
    };

    // diagramView.onClick = function (ev, pos) {
    //     //AddMarking({ type: "point", x: pos.x, ct: -pos.y, label: "Yeey!" }, diagramView);
    //     //if (handleDiagramPointerClick === null)
    //     //    return;
    //     if (!handleDiagramAvailable)
    //         return;
    //     ev.preventDefault();
    //     ev.stopPropagation();

    //     if (handleDiagram["click"] == null)
    //         return;
    //     return handleDiagram["click"](ev, pos, card);
    // };

    // diagramView.onPointerOver = function (ev, pos) {
    //     if (handleDiagramPointerClick === null)
    //         return;
    //     ev.preventDefault();
    //     ev.stopPropagation();

    //     if (handleDiagramPointerOver === null)
    //         return;
    //     return handleDiagramPointerOver(ev, pos, card);
    // };

    // diagramView.onPointerLeave = function (ev, pos) {
    //     if (handleDiagramPointerClick === null)
    //         return;
    //     ev.preventDefault();
    //     ev.stopPropagation();

    //     if (handleDiagramPointerLeave === null)
    //         return;
    //     return handleDiagramPointerLeave(ev, pos, card);
    // };

    diagramView.addGlobalDiagramMouseEvent = function (eventName) {
        let f = function (ev, pos) {
            if (!handleDiagramAvailable)
                return;
            ev.preventDefault();
            ev.stopPropagation();

            if (handleDiagram[eventName] == null)
                return;
            return handleDiagram[eventName](ev, pos, card);
        };
        diagramView["handleGlobal" + eventName] = f;

        diagramView.svgIndications.addMouseEventListener(eventName, f);
    };

    if (views.length > 0)
        diagramView.setSpeed(views[0], 0);
    else
        diagramView.setSpeed(null, 0);

    views.push(diagramView);

    // pointerover: null,
    // pointerleave: null,
    // click: null,
    // pointerdown: null,
    // pointerup: null,
    // pointermove: null,
    // dismiss: null

    diagramView.addGlobalDiagramMouseEvent("click");
    diagramView.addGlobalDiagramMouseEvent("pointerover");
    diagramView.addGlobalDiagramMouseEvent("pointerleave");
    diagramView.addGlobalDiagramMouseEvent("pointerdown");
    diagramView.addGlobalDiagramMouseEvent("pointerup");
    diagramView.addGlobalDiagramMouseEvent("pointermove");
    diagramView.addGlobalDiagramMouseEvent("wheel");

    //diagramView.svgIndications.addMouseEventListener("click", diagramView.onClick);
    //diagramView.svgIndications.addMouseEventListener("pointerover", diagramView.onPointerOver);

    let card = {
        diagramView: diagramView, el: createTemplateInstance("card", $("#cardsholder")[0]),
        bindings: []
    };
    card.perspectiveNumer = nextPerspectiveNumber;
    nextPerspectiveNumber += 1;
    card.title = `Perspective ${card.perspectiveNumer.toFixed(0)}`;

    card.viewSpeedControl = { el: $("[data-id=viewSpeedControl]", card.el)[0] };
    card.controlToggle = { el: $("[data-id=controlToggle]", card.el)[0] };
    card.controlToggle.el.addEventListener("click", function (ev) {
        if (card.viewSpeedControl.el.classList.contains("collapse")) {
            card.viewSpeedControl.el.classList.remove("collapse");
        } else {
            card.viewSpeedControl.el.classList.add("collapse");
        }
    });

    card.setTitle = function (value) {
        card.title = value;
        updateBinding(card, "title");
    }

    card.deleteCard = function () {
        if (views.length > 1 && card.diagramView._speedRelRef === null) {
            let a;
            for (a of card.diagramView.speedDependencies) {
                if (!(a instanceof Function)) {
                    card.diagramView.setSpeed(a, null);
                    break;
                }
            }
        }
        card.el.remove();
        card.el = null;

        for (let i in views) {
            if (views[i] == card.diagramView) {
                views.splice(i, 1);
                break;
            }
        }

        while (card.diagramView.markings.length > 0) {
            let contrPres = card.diagramView.markings[0].controller.presences;
            for (let i in contrPres) {
                if (contrPres[i] === card.diagramView.markings[0]) {
                    contrPres.splice(i);
                    break;
                }
            }
            card.diagramView.markings.splice(0, 1);
        }

        for (let i in cards) {
            if (cards[i] == card) {
                cards.splice(i, 1);
                break;
            }
        }
        for (let i in cards) {
            for (let j in cards[i].viewSpeedControl.sliders) {
                let compSlid = cards[i].viewSpeedControl.sliders[j].comparison;
                if (compSlid == card) {
                    cards[i].viewSpeedControl.sliders[j].el.remove();
                    cards[i].viewSpeedControl.sliders.splice(j, 1);
                }
            }
        }

        card.viewSpeedControl = null;
    };

    card.setZoom = function (value = 1.0, origin = null) {
        if (origin == null)
            origin = { x: 0, y: 0 };
        let newZoom = Math.max(value, 1e-4);

        let xMargin = origin.x * card.diagramView.zoom - card.diagramView.panOffset.x;
        let yMargin = origin.y * card.diagramView.zoom - card.diagramView.panOffset.y;
        card.diagramView.panOffset.x = origin.x * newZoom - xMargin;
        card.diagramView.panOffset.y = origin.y * newZoom - yMargin;

        card.diagramView.zoom = newZoom;
        card.updatePositioning();

        if (theGrid != null) {
            let spacingLevel = Math.ceil(-Math.log(card.diagramView.zoom * 5 / 2) / Math.log(theGrid.majorInterval));

            let canonicalZoom = Math.pow(theGrid.majorInterval, -spacingLevel);
            let isMinorVisible = newZoom / canonicalZoom >= 1.0;

            theGrid.setViewSpacing(Math.pow(theGrid.majorInterval, spacingLevel), canonicalZoom, isMinorVisible, card.diagramView);
        }
    }

    card.zoomIncrease = function (fraction = 0.1, origin = null) {
        this.setZoom(card.diagramView.zoom * (1 + fraction), origin);
    }

    card.zoomDecrease = function (fraction = 0.1, origin = null) {
        this.setZoom(card.diagramView.zoom * (1 - fraction), origin);
    }

    card.setPanOffset = function (x, y) {
        card.diagramView.panOffset = { x: x, y: y };
        card.updatePositioning();
    }

    card.updatePositioning = function () {
        card.diagramView.pannableContent.setTranslation(
            -card.diagramView.panOffset.x,// * card.diagramView.zoom,
            -card.diagramView.panOffset.y);// * card.diagramView.zoom);
        for (let m of card.diagramView.markings) {
            m.updatePosition();
        }
        for (let g of card.diagramView.grids) {
            g.recreate();
        }
    }

    bindElements(card.el, card);
    card.viewSpeedControl.sliders = [];
    card.setZoom(1.0);

    card.addCardLink = function (other) {
        let slider = {
            el: createTemplateInstance("template-relspeed", card.viewSpeedControl.el), bindings: [],
            parent: card, comparison: other
        };
        slider.value = 0;
        slider.valueFormatted = "";
        slider.noFormattedSet = false;

        slider.setValue = function (val, sliderOnly = false) {
            val = parseFloat(val);
            try {
                if (sliderOnly !== true)
                    card.diagramView.setSpeed(other.diagramView, val);
            } catch (ex) {
                alert(ex);
                slider.updateValue();
                return;
            }
            /*slider.value = val;
            updateBinding(slider, "value");*/
            slider.updateValue();
        };

        slider.setValueFormatted = function (val) {
            let res = slider.setValue(parseFloat(val));
            slider.noFormattedSet = false;
            return res;
        }

        slider.setValueFormattedLive = function (val) {
            slider.noFormattedSet = true;
            slider.setValueFormatted(val);
        }

        slider.updateValue = function () {
            slider.value = (card.diagramView.globalBeta - other.diagramView.globalBeta)
                / (1 - card.diagramView.globalBeta * other.diagramView.globalBeta);

            slider.value = Math.round((slider.value + Number.EPSILON) * 1e2) / 1e2;//).toString() + " c";
            slider.valueFormatted = slider.value.toString() + " c";

            updateBinding(slider, "value");

            if (!slider.noFormattedSet) {
                updateBinding(slider, "valueFormatted");
            }

            let disable = false;
            let active = false;

            disable = !card.diagramView.canBaseOn(other.diagramView);

            if (card.diagramView._speedRelRef == other.diagramView)
                active = true;

            if (disable)
                slider.el.classList.add("disabled");
            else
                slider.el.classList.remove("disabled");

            $("input, button", slider.el).prop("disabled", disable);

            // if (active) {
            //     slider.el.style.backgroundColor = "var(--cyan)";
            // } else {
            //     slider.el.style.backgroundColor = "transparent";
            // }
            if (active) {
                slider.el.classList.add("relspeed-active");
                slider.el.classList.remove("relspeed-inactive");
            } else {
                slider.el.classList.add("relspeed-inactive");
                slider.el.classList.remove("relspeed-active");
            }

        }

        other.diagramView.speedDependencies.push(function () {
            slider.updateValue();
        });

        diagramView.speedDependencies.push(function () {
            slider.updateValue();
        });

        card.viewSpeedControl.sliders.push(slider);
        bindElements(slider.el, slider);

        slider.updateValue();
        activateTemplateInstance(slider.el);
    }

    for (let otherCard of cards) {
        card.addCardLink(otherCard);
    }

    cards.push(card);
    for (let c of cards) {
        c.addCardLink(card);
    }

    activateTemplateInstance(card.el);
    for (let m of autoMarkings) {
        m.addToView(diagramView);
    }
    for (let g of autoGrids) {
        g.addToView(diagramView);
    }

    card.producePng = function (pictureElements) {
        if (pictureElements == null || pictureElements.length == 0)
            return;

        //let rect = diagramView.svgElem.el.getBoundingClientRect();
        //let aspectRatio = rect.width / rect.height;
        let viewBoxHeight = card.diagramView.svgElem.el.viewBox.baseVal["height"];

        /* Source: https://stackoverflow.com/questions/12255444/copy-svg-images-from-browser-to-clipboard */
        svgAsPngUri(card.diagramView.svgElem.el, {
            scale: 2000.0 / viewBoxHeight, //card.diagramView.svgElem.el.getBoundingClientRect().width,
            backgroundColor: "rgba(100%, 100%, 100%, 1)", renderingOptions: 0.92
        }).then(uri => {
            for (let el of pictureElements) {
                el.setAttribute("src", uri);
            }
            //pictureEl.style.display = "block";
        });
    }
    card.pngHolder = { elements: $("img[data-binding=\"diagram-pngImg#\"]", card.el).toArray() };
    card.updatePng = function () {
        card.producePng(card.pngHolder.elements);
    }
    card.updatePng();

    for (let pngEl of card.pngHolder.elements) {
        pngEl.addEventListener("contextmenu", card.updatePng);
        pngEl.addEventListener("click", card.updatePng);
        pngEl.addEventListener("pointerover", function () {
            card.updatePng();
            //card.updatePng();
            //$("[data-toggle=\"tooltip\"]", card.el).tooltip();
        });
    }
}

let isColumnWidthFixed;
let maxColumnCount;

function setCardColumns(colCount, fixWidth = false) {
    let selector = "#cardsholder > .lorentz-card";
    maxColumnCount = Math.max(parseInt(colCount ?? 0), 1);
    isColumnWidthFixed = fixWidth;

    if (maxColumnCount == null) {
        changeStylesheetRule(document.styleSheets[document.styleSheets.length - 1], selector, "flex", "1 1 300px");
        changeStylesheetRule(document.styleSheets[document.styleSheets.length - 1], selector, "max-width", "700px");
        //$("#columns-fixed")[0].value = "";
        $("#max-columns")[0].value = "";
    } else {
        changeStylesheetRule(document.styleSheets[document.styleSheets.length - 1], selector,
            "flex", `${isColumnWidthFixed ? "0" : "1"} 1 calc(${100 / maxColumnCount}% - ${10 + 0.1 / maxColumnCount}px)`);

        changeStylesheetRule(document.styleSheets[document.styleSheets.length - 1], selector, "max-width", "auto");
        //$("#columns-fixed")[0].value = colCount;
        $("#max-columns")[0].value = maxColumnCount;
    }
}

function setDiagramHandle(handlers) {
    if (handleDiagramAvailable && handleDiagram["dismiss"] != null)
        handleDiagram["dismiss"]();

    // handleDiagramPointerOver = handlers["pointerover"] ?? null;
    // handleDiagramPointerLeave = handlers["pointerleave"] ?? null;
    // handleDiagramPointerClick = handlers["click"] ?? null;
    // handleDiagramDismiss = handlers["dismiss"] ?? null;
    // handleDiagramPointerDown = handlers["pointerdown"] ?? null;
    // handleDiagramPointerUp = handlers["pointerup"] ?? null;
    // handleDiagramPointerMove = handlers["pointermove"] ?? null;

    handleDiagram = handlers;
    handleDiagramAvailable = handlers != null && Object.keys(handlers).length > 0;
}

let pointAddToggleState;
let rectangleAddToggleState;
let lightRayAddToggleState;
let isPanModus;
let nextLabel = "";
let isClearNextLabel;
let nextPerspectiveNumber;

function takeNextLabel() {
    let value = nextLabel;
    if (nextLabel.length === 1) {
        let charcodeDiff = nextLabel.charCodeAt(0) - "A".charCodeAt(0);

        if (charcodeDiff >= 0 && charcodeDiff < 26)
            setNextLabel(String.fromCharCode("A".charCodeAt(0) + ((charcodeDiff + 1) % 26)));
    }
    return value;
}

function setNextLabel(val) {
    nextLabel = val.trim();
    if (nextLabel.length > 0) {
        $("#nextlabel-clear").removeClass("toggled");
        // $("#nextlabel-clear").addClass("btn-outline-info");
        // $("#nextlabel-clear").removeClass("btn-primary");
        isClearNextLabel = false;
    }
    if (isClearNextLabel) {
        $("#nextlabel").css("color", "gray");
    } else {
        $("#nextlabel").css("color", "");
        $("#nextlabel")[0].value = val;
    }
}

function lorentzTransform(targetGlobalBeta, point, sourceGlobalBeta) {
    let x = point.x;
    let ct = point.ct || -point.y;

    let beta =
        (sourceGlobalBeta - targetGlobalBeta) / (1 - sourceGlobalBeta * targetGlobalBeta);

    let gamma = Math.sqrt(1 / (1 - (beta * beta)))
    let xTransf = gamma * (x + beta * ct);
    let ctTransf = gamma * (ct + beta * x);

    let a = new DOMPoint(xTransf, -ctTransf);
    a.ct = ctTransf;
    return a;
}

const CARD_COLORS = [[120, 0.6, 0.5], [240, 0.6, 0.7], [0, 0.6, 0.6]];
let nextColorIndex;

function getNextColor() {
    let c = CARD_COLORS[nextColorIndex];
    nextColorIndex = (nextColorIndex + 1) % CARD_COLORS.length;
    return c;
}

let theGrid;
let currentGridType;

function setGridRotation(degrees) {
    theGrid.matrix = new DOMMatrix().scaleSelf(10, 10).rotateSelf(degrees);
}

function setGridType(type) {
    let gridTypeSelectedEl = $("#gridTypeSelected")[0];

    if (type === 1) {
        theGrid.setRotation(0);
        theGrid.setGlobalSpacing(theGrid.defaultSpacing);
        theGrid.setVisible(true, true);

        if (gridTypeSelectedEl != null)
            gridTypeSelectedEl.innerHTML = "Grid 1";

    } else if (type === 2) {
        theGrid.setRotation(45);
        theGrid.setGlobalSpacing(theGrid.defaultSpacing / Math.sqrt(2));
        theGrid.setVisible(true, true);

        if (gridTypeSelectedEl != null)
            gridTypeSelectedEl.innerHTML = "Grid 2";

    } else {
        theGrid.setVisible(false, false);

        if (gridTypeSelectedEl != null)
            gridTypeSelectedEl.innerHTML = "Grid 0";
    }

    currentGridType = type;
}

function createLayout() {
    nextColorIndex = 0;
    nextPerspectiveNumber = 1;

    createDiagramCard();
    createDiagramCard();

    // PointMarking.create({ type: "point", x: 10, ct: 30, label: "Cool!" }, views[0]);
    // PointMarking.create({ type: "point", x: -10, ct: 30, label: "Super cool!" }, views[1]);

    theGrid = new Grid(views[1]);

    $("#selectGrid0").click(function () {
        setGridType(0);
    });
    $("#selectGrid1").click(function () {
        setGridType(1);
    });

    $("#selectGrid2").click(function () {
        setGridType(2);
    });


    // setInterval(() => {
    //     let rect = views[0].coordinatePlaced.getCurrentViewBounds();
    //     console.log(`${rect.x.toFixed(2)}, ${rect.y.toFixed(2)}, width: ${rect.width.toFixed(2)}, height: ${rect.height.toFixed(2)}`);
    // }, 1500);

    $("#addcardbutton").click(function (ev) {
        createDiagramCard();
    });

    // $("#columns-fixed").on("input", function(ev) {
    //     let val = $("#columns-fixed")[0].value;
    //     setCardColumns((val == "") ? null : parseFloat(val));
    // });

    // $("#columns-auto").click(function(ev) {
    //     setCardColumns(null);
    // });

    maxColumnCount = null;
    isColumnWidthFixed = false;
    pointAddToggleState = 0;
    rectangleAddToggleState = 0;
    lightRayAddToggleState = 0;
    isClearNextLabel = false;

    $("#max-columns-minus").click(function (ev) {
        setCardColumns((maxColumnCount ?? 2) - 1, isColumnWidthFixed);
    });
    $("#max-columns").on("input", function (ev) {
        let val = $("#max-columns")[0].value;
        maxColumnCount = (val == "") ? null : parseFloat(val);
        setCardColumns(maxColumnCount, isColumnWidthFixed);
    });
    $("#max-columns-plus").click(function (ev) {
        setCardColumns((maxColumnCount ?? 0) + 1, isColumnWidthFixed);
    });

    $("#columns-fixwidth").click(function (ev) {
        if (isColumnWidthFixed) {
            isColumnWidthFixed = false;
            $("#columns-fixwidth").removeClass("toggled");

            // $("#columns-fixwidth").addClass("btn-outline-info");
            // $("#columns-fixwidth").removeClass("btn-primary");

        } else {
            isColumnWidthFixed = true;
            $("#columns-fixwidth").addClass("toggled");

            // $("#columns-fixwidth").addClass("btn-primary");
            // $("#columns-fixwidth").removeClass("btn-outline-info");
        }
        setCardColumns(maxColumnCount, isColumnWidthFixed);
    });

    let toggleAddPoint = function () {
        if (pointAddToggleState == 2) {
            setDiagramHandle({});

        } else if (pointAddToggleState == 1) {
            pointAddToggleState = 2;
            $("#interaction-addpoint").addClass("toggled");
            $("#interaction-addpoint").addClass("second-stage");

            // $("#interaction-addpoint").addClass("btn-success");
            // $("#interaction-addpoint").removeClass("btn-primary");

        } else {
            // $("#interaction-addpoint").addClass("btn-primary");
            // $("#interaction-addpoint").removeClass("btn-outline-info");
            $("#interaction-addpoint").addClass("toggled");

            pointAddToggleState = 1;
            setDiagramHandle({
                click: function (event, pos, card) {
                    PointMarking.create({ type: "point", x: pos.x, ct: -pos.y, label: takeNextLabel() }, card.diagramView);
                    if (pointAddToggleState == 1)
                        setDiagramHandle({});
                },
                dismiss: function () {
                    pointAddToggleState = 0;
                    // $("#interaction-addpoint").addClass("btn-outline-info");
                    // $("#interaction-addpoint").removeClass("btn-primary");
                    // $("#interaction-addpoint").removeClass("btn-info");
                    // $("#interaction-addpoint").removeClass("btn-success");

                    $("#interaction-addpoint").removeClass("toggled");
                    $("#interaction-addpoint").removeClass("second-stage");
                }
            });
        }
    }

    $("#interaction-addpoint").click(function (ev) {
        toggleAddPoint();
    });

    let toggleAddRectangle = function () {
        if (rectangleAddToggleState == 2) {
            setDiagramHandle({});
        } else if (rectangleAddToggleState == 1) {
            rectangleAddToggleState = 2;
            $("#interaction-addrectangle").addClass("toggled");
            $("#interaction-addrectangle").addClass("second-stage");
            // $("#interaction-addrectangle").addClass("btn-success");
            // $("#interaction-addrectangle").removeClass("btn-primary");

        } else {
            // $("#interaction-addrectangle").addClass("btn-primary");
            // $("#interaction-addrectangle").removeClass("btn-outline-info");
            $("#interaction-addrectangle").addClass("toggled");

            rectangleAddToggleState = 1;
            setDiagramHandle({
                click: function (event, pos, card) {
                    let alignX = 5;
                    let alignY = 5;
                    let top = Math.ceil(pos.y / alignY) * alignY;
                    let left = Math.floor(pos.x / alignX) * alignX;

                    Rectangle.create({
                        minX: left, maxX: left + 5.0,
                        minCt: -top, maxCt: -top + 20, label: takeNextLabel()
                    }, card.diagramView);

                    if (rectangleAddToggleState == 1)
                        setDiagramHandle({});
                },
                dismiss: function () {
                    rectangleAddToggleState = 0;
                    // $("#interaction-addrectangle").addClass("btn-outline-info");
                    // $("#interaction-addrectangle").removeClass("btn-primary");
                    // $("#interaction-addrectangle").removeClass("btn-info");
                    // $("#interaction-addrectangle").removeClass("btn-success");

                    $("#interaction-addrectangle").removeClass("toggled");
                    $("#interaction-addrectangle").removeClass("second-stage");
                }
            });
        }
    }

    $("#interaction-addrectangle").click(function (ev) {
        toggleAddRectangle();
    });


    let toggleAddLightRay = function () {
        if (lightRayAddToggleState == 2) {
            setDiagramHandle({});
        } else if (lightRayAddToggleState == 1) {
            lightRayAddToggleState = 2;
            $("#interaction-addlightray").addClass("toggled");
            $("#interaction-addlightray").addClass("second-stage");

        } else {
            $("#interaction-addlightray").addClass("toggled");

            lightRayAddToggleState = 1;
            setDiagramHandle({
                click: function (event, pos, card) {
                    let alignX = 5;
                    let alignY = 5;
                    let top = Math.floor(pos.y / alignY) * alignY;
                    let left = Math.floor(pos.x / alignX) * alignX;

                    LightRay.create({
                        startX: left, startCt: -top, label: ""// takeNextLabel()
                    }, card.diagramView);

                    if (lightRayAddToggleState == 1)
                        setDiagramHandle({});
                },
                dismiss: function () {
                    lightRayAddToggleState = 0;

                    $("#interaction-addlightray").removeClass("toggled");
                    $("#interaction-addlightray").removeClass("second-stage");
                }
            });
        }
    }

    $("#interaction-addlightray").click(function (ev) {
        toggleAddLightRay();
    });

    let togglePan = function () {
        if (isPanModus) {
            setDiagramHandle({});
        } else {
            // $("#interaction-pan").addClass("btn-primary");
            // $("#interaction-pan").removeClass("btn-outline-info");
            $("#interaction-pan").addClass("toggled");

            $(".pannable-diagram").css("cursor", "all-scroll");

            isPanModus = true;
            let transfMatrix = null;
            let originalOffset;
            let grapPoint;

            setDiagramHandle({
                pointerdown: function (event, pos, card) {
                    event.target.setPointerCapture(event.pointerID);
                    originalOffset = { x: card.diagramView.panOffset.x, y: card.diagramView.panOffset.y };
                    grapPoint = DOMPoint.fromPoint(pos);
                    transfMatrix = new DOMMatrix().translateSelf(-grapPoint.x, -grapPoint.y).preMultiplySelf(new DOMMatrix().scaleSelf(-1, -1));
                    event.preventDefault();
                },
                pointerup: function (event, pos, card) {
                    transfMatrix = null;
                    event.target.releasePointerCapture(event.pointerID);
                    event.preventDefault();
                },
                pointermove: function (event, pos, card) {
                    if (transfMatrix !== null) {
                        let point = DOMPoint.fromPoint(pos);
                        point = point.matrixTransform(transfMatrix)
                            .matrixTransform(new DOMMatrix().scaleSelf(card.diagramView.zoom, card.diagramView.zoom))
                            .matrixTransform(new DOMMatrix().translateSelf(card.diagramView.panOffset.x, card.diagramView.panOffset.y));

                        card.setPanOffset(point.x, point.y);
                    }
                    event.preventDefault();
                },
                wheel: function (event, pos, card) {
                    let scrollAmount = event.deltaY;
                    if (event.deltaMode == 1) {
                        scrollAmount = -0.1 * scrollAmount / 10;
                    } else {
                        scrollAmount = scrollAmount / 1000;
                    }
                    card.zoomIncrease(scrollAmount, pos);
                    event.preventDefault();
                },
                dismiss: function () {
                    isPanModus = false;
                    $(".pannable-diagram").css("cursor", "");

                    // $("#interaction-pan").addClass("btn-outline-info");
                    // $("#interaction-pan").removeClass("btn-primary");
                    $("#interaction-pan").removeClass("toggled");
                }
            });
        }
    }

    $("#interaction-pan").click(function (ev) {
        togglePan();
    });

    $("#nextlabel").on("input", function (ev) {
        let val = $("#nextlabel")[0].value;
        setNextLabel(val);
    });

    $("#nextlabel-clear").click(function (ev) {
        if (isClearNextLabel) {
            let val = $("#nextlabel")[0].value.trim();
            if (val.length == 0)
                val = "A";
            setNextLabel(val);
        } else {
            isClearNextLabel = true;
            setNextLabel("");
            $("#nextlabel-clear").addClass("toggled");
        }
    });

    setCardColumns(4, false);
    setNextLabel("A");
}

