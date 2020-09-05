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

let cards = [];

function createDiagramCard() {
    let diagramView = { el: createTemplateInstance("diagram-view", null, true), markings: [] };
    diagramView.highlight = { el: $("[data-id=diagram-highlight]", diagramView.el)[0] };

    diagramView._speedRelRef = undefined;
    diagramView._speedRel = 0;
    diagramView.speedDependencies = [];

    diagramView.canBaseOn = function (relView) {
        if (this._speedRelRef === null && relView !== this)
            return true;
        let b = relView;
        while (b !== null && b !== this) {
            b = b._speedRelRef;
        }
        return b === null;
    }

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

        for (let dep of this.speedDependencies) {
            if (dep instanceof Function) {
                dep();
            } else {
                dep.updateSpeed();
            }
        }
    };

    if (views.length > 0)
        diagramView.setSpeed(views[0], 0);
    else
        diagramView.setSpeed(null, 0);

    views.push(diagramView);

    let card = { diagramView: diagramView, el: createTemplateInstance("card", $("#cardsholder")[0]) };
    card.viewSpeedControl = { el: $("[data-id=viewSpeedControl]", card.el)[0] };
    card.controlToggle = { el: $("[data-id=controlToggle]", card.el)[0] };
    card.controlToggle.el.addEventListener("click", function (ev) {
        if (card.viewSpeedControl.el.classList.contains("collapse")) {
            card.viewSpeedControl.el.classList.remove("collapse");
        } else {
            card.viewSpeedControl.el.classList.add("collapse");
        }
    });
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

    bindElements(card.el, card);
    card.viewSpeedControl.sliders = [];

    card.addCardLink = function (other) {
        let slider = {
            el: createTemplateInstance("template-relspeed", card.viewSpeedControl.el), bindings: [],
            parent: card, comparison: other
        };
        slider.value = 0;
        slider.valueFormatted = "";
        slider.noFormattedSet = false;

        slider.setValue = function (val) {
            val = parseFloat(val);
            try {
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
}

let isColumnWidthFixed;
let maxColumnCount;

function setCardColumns(colCount, fixWidth = false) {
    let selector = "#cardsholder > .lorentz-card";
    maxColumnCount = colCount;
    isColumnWidthFixed = fixWidth;

    if (maxColumnCount == null) {
        changeStylesheetRule(document.styleSheets[document.styleSheets.length - 1], selector, "flex", "1 1 300px");
        changeStylesheetRule(document.styleSheets[document.styleSheets.length - 1], selector, "max-width", "500px");
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

function createLayout() {
    createDiagramCard();
    createDiagramCard();

    AddMarking({ type: "point", x: 10, ct: 30, label: "Cool!" }, views[0]);
    AddMarking({ type: "point", x: -10, ct: 30, label: "Super cool!" }, views[1]);

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


    $("#max-columns").on("input", function (ev) {
        let val = $("#max-columns")[0].value;
        maxColumnCount = (val == "") ? null : parseFloat(val);
        setCardColumns(maxColumnCount, isColumnWidthFixed);
    });

    $("#columns-fixwidth").click(function (ev) {
        if (isColumnWidthFixed) {
            isColumnWidthFixed = false;
            $("#columns-fixwidth").addClass("btn-outline-info");
            $("#columns-fixwidth").removeClass("btn-primary");

        } else {
            isColumnWidthFixed = true;
            $("#columns-fixwidth").addClass("btn-primary");
            $("#columns-fixwidth").removeClass("btn-outline-info");
        }
        setCardColumns(maxColumnCount, isColumnWidthFixed);
    });

    setCardColumns(4, false);
}

