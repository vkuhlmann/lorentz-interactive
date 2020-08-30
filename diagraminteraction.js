"use strict";
let markings = {};
let markingID = 0;
let openPanels = [];

function setTopPanel(panel) {
    let zIndex = 0;
    let found = false;
    for (const p of openPanels) {
        if (p === panel)
            found = true;
        else
            zIndex = Math.max(zIndex, p.zIndex);
    }
    panel.zIndex = zIndex + 1;
    panel.el.style["z-index"] = panel.zIndex;
    if (!found)
        openPanels.push(panel);
}

function removePanelFromStack(panel) {
    for (let i = 0; i < openPanels.length;) {
        if (openPanels[i] === panel) {
            openPanels.splice(i);
        } else {
            i++;
        }
    }
}

function hoverPointEdit(sender, objID) {
    let obj = markings[objID];
    let rect = obj.el.getBoundingClientRect();
    let containerRect = $("#diagram-viewer")[0].getBoundingClientRect();

    let margin = 10;
    $("#diagram-highlight")[0].style.left = `${rect.x - containerRect.x - margin}px`;
    $("#diagram-highlight")[0].style.top = `${rect.y - containerRect.y - margin}px`;
    $("#diagram-highlight")[0].style.width = `${rect.width + 2 * margin}px`;
    $("#diagram-highlight")[0].style.height = `${rect.height + 2 * margin}px`;
    $("#diagram-highlight")[0].style.display = "block";

    sender.addEventListener("mouseleave", function () {
        $("#diagram-highlight")[0].style.display = "none";
    });
}

function bindPointEditElements(panel) {
    $("[data-binding=closeButton]", panel.el).on("click", function () {
        panel.close();
    });

    function updateField(name) {
        for (let binding of $(`[data-binding=${name}]`, panel.el)) {
            if (binding.tagName == "INPUT") {
                binding.value = panel.obj[name];

                if (binding.getAttribute("listens") !== "true"){
                    binding.addEventListener("input", function(){
                        try {
                            panel.obj[`set${name.substr(0, 1).toUpperCase()}${name.substr(1)}`](binding.value);
                        } catch(ex) {}
                    });
                    binding.addEventListener("change", function() {
                        try {
                            panel.obj[`set${name.substr(0, 1).toUpperCase()}${name.substr(1)}`](binding.value);
                        } catch(ex) {
                            alert("Invalid value! " + ex.toString());
                            return false;
                        }
                    });

                    binding.setAttribute("listens", "true");
                }
            } else {
                binding.innerHTML = panel.obj[name];
            }
        }
    }

    const regularFields = ["label", "x", "ct"];

    function updateFields() {
        for (name of regularFields) {
            updateField(name);
        }
    }

    // Source: https://stackoverflow.com/questions/2998784/how-to-output-numbers-with-leading-zeros-in-javascript
    function pad(num, size) {
        var s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    }

    function createColorBinding(name) {
        let suppressUpdate = false;

        let targetElements = $(`[data-binding=${name}]`, panel.el).toArray();
        if (targetElements == 0)
            return;

        if (panel.obj.color === undefined)
            panel.obj.color = "#000";

        // Source: https://www.npmjs.com/package/@simonwep/pickr
        const pickr = Pickr.create({
            el: targetElements[0],
            theme: 'classic', // or 'monolith', or 'nano'
            container: panel.el,
            comparison: false,
            default: panel.obj.color,

            swatches: [
                'rgba(244, 67, 54, 1)',
                'rgba(233, 30, 99, 0.95)',
                'rgba(156, 39, 176, 0.9)',
                'rgba(103, 58, 183, 0.85)',
                'rgba(63, 81, 181, 0.8)',
                'rgba(33, 150, 243, 0.75)',
                'rgba(3, 169, 244, 0.7)',
                'rgba(0, 188, 212, 0.7)',
                'rgba(0, 150, 136, 0.75)',
                'rgba(76, 175, 80, 0.8)',
                'rgba(139, 195, 74, 0.85)',
                'rgba(205, 220, 57, 0.9)',
                'rgba(255, 235, 59, 0.95)',
                'rgba(255, 193, 7, 1)'
            ],

            components: {

                // Main components
                //preview: true,
                opacity: true,
                hue: true,

                // Input / output Options
                interaction: {
                    hex: true,
                    rgba: true,
                    hsla: true,
                    hsva: true,
                    cmyk: true,
                    input: true,
                    clear: true,
                    save: false
                }
            }
        });

        // let wasAccepted = pickr.setColor(panel.obj.color);
        // console.log(wasAccepted);
        // wasAccepted = pickr.applyColor();
        // console.log(wasAccepted);
        // console.log(panel.obj.color);

        pickr.on("change", function (color, instance) {
            let d = new Date();
            let timeString = pad(d.getHours(), 2) + ":"
                + pad(d.getMinutes(), 2) + ":"
                + pad(d.getSeconds(), 2);

            //console.log(`[${timeString}] Color changed!`);
            panel.obj[`set${name.substr(0, 1).toUpperCase()}${name.substr(1)}`](color.toRGBA().toString(2));
        });

        panel.pickr = pickr;
    }


    function updateObject() {

    }

    updateFields();
    createColorBinding("color");
}

function openPointEdit(sender, objID, closeOnOtherOpen = true) {
    //sender.style["fill"] = "red";
    let obj = markings[objID];
    //obj.el.style["fill"] = "green";

    if (obj.currentEditPanel == null) {
        let posX = obj.el.getBoundingClientRect().x + 50;
        let posY = obj.el.getBoundingClientRect().y + 20;

        console.log(`Setting pointEditPanel to location ${posX}, ${posY}`);

        let panelEl = $("#pointEditPanel")[0].cloneNode(true);
        let modifyNodes = $("[id]", panelEl).toArray();

        for (let modifyNode of modifyNodes) {
            modifyNode.setAttribute("data-id", modifyNode.getAttribute("id"));
            modifyNode.removeAttribute("id");
        }

        panelEl.style.left = `${posX}px`;
        panelEl.style.top = `${posY}px`;
        $("#diagram-viewer")[0].appendChild(panelEl);

        function panelClose() {
            if (panel.pickr != null) {
                panel.pickr.hide();
                panel.pickr.destroyAndRemove();
                panel.pickr = null;
            }

            if (obj.currentEditPanel === panel)
                obj.currentEditPanel = null;
            removePanelFromStack(panel);
            if (panel.el != null) {
                panel.el.style.display = "none";
                panel.el.remove();
                //$("#diagram-viewer")[0].removeChild(panel.el);
            }
            panel.el = null;
            return true;
        }

        let panel = { el: panelEl, obj: obj };
        bindPointEditElements(panel);

        let canceled = !$("#diagram-viewer")[0].dispatchEvent(new CustomEvent("panelopen",
            {
                bubbles: true,
                detail: {
                    panel: panel
                },
                cancelable: true
            }));
        if (canceled)
            return false;

        panel["close"] = panelClose;

        obj.currentEditPanel = panel;

        panel.el.style.display = "block";

        if (closeOnOtherOpen) {
            let autoCloseFunction = function () {
                panel.close();
                $("#diagram-viewer")[0].removeEventListener("panelopen", autoCloseFunction);
            }

            $("#diagram-viewer")[0].addEventListener("panelopen", autoCloseFunction);
        }
    }
    setTopPanel(obj.currentEditPanel);
    return true;
}

function AddMarking(obj) {
    if (obj.type === "point") {
        let el = $("#pointmarker")[0].cloneNode(true);
        $("[data-binding=label]", el)[0].innerHTML = obj.label;
        el.id = obj.id = `marking${markingID}`;
        obj.el = el;
        markingID += 1;

        obj.origX = obj.x;
        obj.origCt = obj.ct;

        markings[obj.id] = obj;

        obj.setPos = function (x, ct) {
            //obj.x = x;
            //obj.ct = ct;
            el.setAttribute("transform", `translate(${x} ${-ct})`);
        };
        obj.setPos(obj.x, obj.ct);

        obj.setSpeed = function (beta) {
            let gamma = Math.sqrt(1 / (1 - (beta * beta)))
            let xTransf = gamma * (obj.x - beta * obj.ct);
            let ctTransf = gamma * (obj.ct - beta * obj.x);

            obj.setPos(xTransf, ctTransf);
        };

        obj.setLabel = function(label){
            if (label == "sinterklaas")
                throw "Hoofdletters!";
            obj.label = label;
            $("[data-binding=label]", el)[0].innerHTML = obj.label;
        }

        obj.setColor = function (color) {
            obj.color = color;
            //$("[data-binding=centerpoint]", obj.el)[0].style.fill = obj.color;
            obj.el.style.fill = obj.color;
            obj.el.dispatchEvent(new CustomEvent("colorchanged", { detail: { color: obj.color, obj: obj } }));
        }

        obj.setX = function(x) {
            obj.x = x;
            obj.setPos(x, obj.ct);
        }

        obj.setCt = function(ct) {
            obj.ct = ct;
            obj.setPos(obj.x, ct);
        }

        el.addEventListener("mouseover",
            function () {
                hoverPointEdit(el, obj.id);
            });
        el.addEventListener("click",
            function () {
                openPointEdit(el, obj.id);
            });

        // $("#" + el.id).on("mouseover", function(){
        // });

        $("#diagramIndications")[0].appendChild(obj.el);
    }
};

let currentSpeed = 0.0;

function updatePNG() {
    /* Source: https://stackoverflow.com/questions/12255444/copy-svg-images-from-browser-to-clipboard */
    svgAsPngUri(document.getElementById("diagram"), { scale: 8.0 }).then(uri => {
        $("#diagram_png").attr('src', uri).show();
    });
}

$(document).ready(function () {
    debugger;

    $("#diagram_png")[0].style.width = `${$("#diagram")[0].clientWidth}px`;
    $("#diagram_png")[0].style.height = `${$("#diagram")[0].clientHeight}px`;

    updatePNG();
    AddMarking({ type: "point", x: 10, ct: 30, label: "Cool!" });
    AddMarking({ type: "point", x: -10, ct: 30, label: "Super cool!" });

    $("#speedSlider")[0].value = 0;

    $("#speedSlider").on('input', function () {
        //debugger;
        //speedDiff = $("#speedSlider")[0].value - currentSpeed;
        currentSpeed = $("#speedSlider")[0].value * 1 / 100;

        for (const id in markings) {
            markings[id].setSpeed(currentSpeed);
        }
        console.log(`Speed has been set to ${currentSpeed}`);
    });

    //initColorPicker();
});
