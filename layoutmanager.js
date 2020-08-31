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

function createTemplateInstance(template, container) {
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

    if (container != null) {
        el.style.visibility = "hidden";
        el.style.display = "block";
        container.appendChild(el);
    }
    return el;
}

function createDiagramCard() {
    card = {diagramView: {el: createTemplateInstance("diagram-view", null)}};

    card.el = createTemplateInstance("card", "cardsholder");
    bindElements(card.el, card);
}

function createLayout(){
    createDiagramCard();
}

