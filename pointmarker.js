"use strict";

function hoverPointEdit(presence) {
    let obj = presence.controller;
    let view = presence.view;

    let rect = presence.el.getBoundingClientRect();
    let containerRect = view.el.getBoundingClientRect();

    let margin = 10;
    view.highlight.el.style.left = `${rect.x - containerRect.x - margin}px`;
    view.highlight.el.style.top = `${rect.y - containerRect.y - margin}px`;
    view.highlight.el.style.width = `${rect.width + 2 * margin}px`;
    view.highlight.el.style.height = `${rect.height + 2 * margin}px`;
    view.highlight.el.style.display = "block";

    presence.el.addEventListener("pointerleave", function () {
        view.highlight.el.style.display = "none";
    });
}

function openPointEdit(presence, closeOnOtherOpen = false) {
    let obj = presence.controller;
    let view = presence.view;

    if (obj.currentEditPanel == null) {
        let panel = createPanelFromTemplate($("#pointEditPanel")[0], view);
        if (panel == null)
            return false;

        panel.obj = obj;
        panel.view = view;
        panel.presence = presence;

        panel.reposition = function () {
            positionPanel(this, presence.el.getBoundingClientRect());
        };

        panel.reposition();

        bindElements(panel.el, [panel, panel.presence, panel.presence.controller]);

        let canceled = !view.el.dispatchEvent(new CustomEvent("panelopen",
            {
                bubbles: true,
                detail: {
                    panel: panel
                },
                cancelable: true
            }));
        if (canceled) {
            panelClose();
            return false;
        }

        panel.el.addEventListener("closed", function (e) {
            if (panel.pickr != null) {
                panel.pickr.destroyAndRemove();
                panel.pickr = null;
            }

            if (obj.currentEditPanel === panel)
                obj.currentEditPanel = null;
        });
        obj.currentEditPanel = panel;
        panel.show();

        if (closeOnOtherOpen) {
            let autoCloseFunction = function () {
                panel.close();
                view.el.removeEventListener("panelopen", autoCloseFunction);
            }

            view.el.addEventListener("panelopen", autoCloseFunction);
        }
    }
    setTopPanel(obj.currentEditPanel);
    return true;
}

class PointerMarkerPresence {
    constructor(controller, view) {
        let diagramIndications = $("[data-binding=diagram-indications]", view.el)[0];
        let el = createTemplateInstance("template-pointmarker", diagramIndications);

        this.view = view;
        this.el = el;
        this.controller = controller;
        this.bindings = [];

        this.view.markings.push(this);
        this.controller.presences.push(this);

        //$("[data-binding=label]", el)[0].innerHTML = obj.label;
        this.el.id = `view${view.id}_marking${markingID}`;
        markingID += 1;

        this.onViewBetaSet(view.globalBeta);
        this._updateColor();

        const pointmarkerpresence = this;
        this.el.addEventListener("pointerover",
            function () {
                hoverPointEdit(pointmarkerpresence);
            });
        this.el.addEventListener("click",
            function () {
                openPointEdit(pointmarkerpresence);
            });

        bindElements(el, [this, this.controller]);
        activateTemplateInstance(el);
    };

    deletePresence() {
        if (this.currentEditPanel != null)
            this.currentEditPanel.close();

        if (this.el != null)
            this.el.remove();
        this.el = null;

        removeFromArr(this.view.markings, this);
        removeFromArr(this.controller.presences, this);
    }

    _setPos(x, ct) {
        this.x = x;
        this.ct = ct;
        //obj.x = x;
        //obj.ct = ct;
        this.el.setAttribute("transform", `translate(${x * this.view.zoom} ${-ct * this.view.zoom})`);
    };

    _setColor(c) {
        this.el.style.fill = c;
    }

    _updateColor() {
        this._setColor(this.controller.color.value);
    }

    //obj.presences[view].setPos(obj.x, obj.ct);

    onViewBetaSet(beta) {
        this.viewBeta = beta;
        this._recalcPosition();
    }

    updatePosition() {
        this._recalcPosition();
    };

    _recalcPosition() {
        this.baseTransfBeta =
            (this.controller.positionView.globalBeta - this.viewBeta) / (1 - this.controller.positionView.globalBeta * this.viewBeta);

        let beta = this.baseTransfBeta;

        let gamma = Math.sqrt(1 / (1 - (beta * beta)))
        let xTransf = gamma * (this.controller.x + beta * this.controller.ct);
        let ctTransf = gamma * (this.controller.ct + beta * this.controller.x);

        this._setPos(xTransf, ctTransf);
    };

}

class PointerMarkerController {
    constructor(obj, positionView) {
        this.bindings = obj.bindings || {};
        Object.assign(this, obj);

        this.presences = [];//{};

        if (this.color == null)
            this.color = {};
        if (this.color.value == null)
            this.color.value = "#000";

        this.positionView = positionView;

        positionView.speedDependencies.push(this.onPositionViewSpeedChanged);

        autoMarkings.push(this);

        for (let v of views) {
            this.addToView(v);
        }
    }

    onPositionViewSpeedChanged() {
        this._recalcPositions();
    };

    setLabel(label) {
        if (label == "sinterklaas")
            throw "Hoofdletters!";
        this.label = label;
        updateBinding(this, "label");
        //$("[data-binding=label]", el)[0].innerHTML = obj.label;
    };

    setX(x) {
        this.x = parseFloat(x);
        updateBinding(this, "x");
        this._recalcPositions();
    };

    setCt(ct) {
        this.ct = parseFloat(ct);
        updateBinding(this, "ct");
        this._recalcPositions();
    };

    _recalcPositions() {
        for (let pres of this.presences) {
            pres._recalcPosition();
        }
    };

    deleteMarking() {
        removeFromArr(autoMarkings, this);

        while (this.presences.length > 0) {
            this.presences[0].deletePresence();
        }

        removeFromArr(positionView.speedDependencies, obj.onPositionViewSpeedChanged);
    };

    addToView(view) {
        AddMarkingToView(this, view);
    };

    setColor(color) {
        if (this.color.suppressSet)
            return;
        this.color.suppressSet = true;
        this.color.value = color;
        //$("[data-binding=centerpoint]", obj.el)[0].style.fill = obj.color;
        updateBinding(this, "color");
        this._updateColors();
        delete this.color.suppressSet;
        //obj.el.style.fill = obj.color;
        //obj.el.dispatchEvent(new CustomEvent("colorchanged", { detail: { color: obj.color, obj: obj } }));
    };

    _updateColors() {
        for (let pres of this.presences) {
            pres._updateColor();
        }
    };
}

function AddMarkingToView(obj, view) {
    new PointerMarkerPresence(obj, view);
}

function AddMarking(obj, positionView) {
    if (obj.type === "point") {
        new PointerMarkerController(obj, positionView);
    }
};
