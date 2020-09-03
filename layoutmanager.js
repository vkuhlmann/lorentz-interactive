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

function createTemplateInstance(template, container, activeOnAdd = false) {
    let el;
    if (typeof(template) == "string") {
        el = $(`#${template}`)[0].cloneNode(true);
    } else {
        el = template.cloneNode(true);
    }

    let modifyNodes = $("[id]", el).toArray();
    if (el.hasAttribute("id"))
        modifyNodes.push(el);

    for (let modifyNode of modifyNodes) {
        modifyNode.setAttribute("data-id", modifyNode.getAttribute("id"));
        modifyNode.removeAttribute("id");
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
    let diagramView = {el: createTemplateInstance("diagram-view", null, true), markings: []};
    diagramView.highlight = {el: $("[data-id=diagram-highlight]", diagramView.el)[0]};

    diagramView._speedRelRef = null;
    diagramView._speedRel = 0;
    diagramView.speedDependencies = [];

    diagramView.setSpeed = function(relView, relSpeed = null) {
        if (relView !== this._speedRelRef) {
            if (this._speedRelRef == null && relView !== null)
                relView.setSpeed(null);

            let b = relView;
            while (b !== null && b !== this) {
                b = relView._speedRelRef;
            }
            if (b !== null)
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

        this._speedRel = relSpeed;
        this.updateSpeed();
    };

    diagramView.updateSpeed = function() {
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

    let card = {diagramView: diagramView, el: createTemplateInstance("card", $("#cardsholder")[0])};
    card.viewSpeedControl = {el: $("[data-id=viewSpeedControl]", card.el)[0]};
    bindElements(card.el, card);
    card.viewSpeedControl.sliders = [];

    card.addCardLink = function(other) {
        let slider = {el: createTemplateInstance("template-relspeed", card.viewSpeedControl.el), bindings: []};
        slider.value = 0;
        slider.setValue = function(val) {
            card.diagramView.setSpeed(other.diagramView, val);
            slider.value = val;
            updateBinding(slider, "value");
        };

        card.viewSpeedControl.sliders.push(slider);
        bindElements(slider.el, slider);
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

function createLayout() {
    createDiagramCard();
    createDiagramCard();

    AddMarking({ type: "point", x: 10, ct: 30, label: "Cool!" }, views[0]);
    AddMarking({ type: "point", x: -10, ct: 30, label: "Super cool!" }, views[1]);
}

