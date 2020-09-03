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

function activeTemplateInstance(el) {
    el.classList.remove("template-staging");
}

function createDiagramCard() {
    let diagramView = {el: createTemplateInstance("diagram-view", null, true), markings: []};
    diagramView.highlight = {el: $("[data-id=diagram-highlight]", diagramView.el)[0]};

    diagramView.setGlobalSpeed = function(globalBeta) {
        this.globalBeta = globalBeta;
        for (let presence of this.markings) {
            presence.onViewBetaSet(this.globalBeta);
        }
    }
    diagramView.setGlobalSpeed(0);
    views.push(diagramView);

    let card = {diagramView: diagramView, el: createTemplateInstance("card", $("#cardsholder")[0])};
    bindElements(card.el, card);

    activeTemplateInstance(card.el);
    for (let m of autoMarkings) {
        m.addToView(diagramView);
    }

}

function createLayout() {
    createDiagramCard();
    createDiagramCard();

    AddMarking({ type: "point", x: 10, ct: 30, label: "Cool!" }, views[0]);
    AddMarking({ type: "point", x: -10, ct: 30, label: "Super cool!" }, views[0]);
}

