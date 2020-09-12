"use strict";

let openPanels = [];
function setTopPanel(panel) {
    let zIndex = 2;
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

class Panel {
    constructor(template, view) {
        let canceled = !view.el.dispatchEvent(new CustomEvent("panelcreating",
            {
                bubbles: true,
                detail: {
                    template: template,
                    view: view
                },
                cancelable: true
            }));

        if (canceled) {
            panelClose();
            return false;
        }

        this.view = view;
        this.el = createTemplateInstance(template, this.view.el);

        this.moving = false;

        const panel = this;
        $(".panel-grip", panel.el).on("pointerdown", function (ev) {
            this.setPointerCapture(ev.pointerId);
            panel.moving = true;
            this.style.cursor = "move";

            let prevPos = panel.getPositionOnViewport();
            let translX = prevPos.x - ev.screenX;
            let translY = prevPos.y - ev.screenY;

            function onMove(moveEv) {
                if (ev.pointerId !== moveEv.pointerId)
                    return;
                panel.setPositionOnViewport(moveEv.screenX + translX, moveEv.screenY + translY);
            }

            this.addEventListener("pointermove", onMove);

            this.addEventListener("pointerup", function () {
                this.releasePointerCapture(ev.pointerId);
                panel.moving = false;
                this.style.cursor = "auto";
                this.removeEventListener("pointermove", onMove);
            });
        });

        bindElements(this.el, [this]);
        this.hide();
        activateTemplateInstance(this.el);
    };

    close() {
        if (this.el != null && !this.el.dispatchEvent(new CustomEvent("closing", { detail: { panel: this }, cancelable: true, bubbles: false })))
            return false;
        // if (panel.pickr != null) {
        //     panel.pickr.hide();
        //     panel.pickr.destroyAndRemove();
        //     panel.pickr = null;
        // }
        if (this.el != null) {
            this.el.style.display = "none";
            this.el.dispatchEvent(new CustomEvent("closed", { detail: { panel: this }, cancelable: false, bubbles: false }));
            this.el.remove();
        }

        removePanelFromStack(this);
        this.el = null;
        return true;
    }

    show() {
        if (this.el != null) {
            if (!this.el.dispatchEvent(new CustomEvent("show", { detail: { panel: this }, cancelable: true, bubbles: false })))
                return false;
            this.el.style.visibility = "visible";
            return true;
        }
        return undefined;
    }

    hide() {
        if (this.el != null) {
            if (!this.el.dispatchEvent(new CustomEvent("hide", { detail: { panel: this }, cancelable: true, bubbles: false })))
                return false;
            this.el.style.visibility = "hidden";
            return true;
        }
        return undefined;
    }

    setPositionOnViewport(x, y) {
        if (this.el != null) {
            this.el.style.left = `${x - this.view.el.getBoundingClientRect().left}px`;
            this.el.style.top = `${y - this.view.el.getBoundingClientRect().top}px`;
        }
    }

    getPositionOnViewport() {
        let rect = this.el.getBoundingClientRect();
        return { x: rect.left, y: rect.top };
    }

    getWidth() {
        return this.el?.getBoundingClientRect().width;
    };

    getHeight() {
        return this.el?.getBoundingClientRect().height;
    };

    autoposition(targetRect, targetMargin = 10, panelContainBounds = null) {
        let alignRect = new DOMRect(targetRect.left - targetMargin, targetRect.top - targetMargin,
            targetRect.width + 2 * targetMargin, targetRect.height + 2 * targetMargin);

        let panelWidth = this.getWidth();
        let panelHeight = this.getHeight();

        // if (panelContainBounds == null)
        //     panelContainBounds = new DOMRect(document.documentElement.clientLeft, document.documentElement.clientTop,
        //         document.documentElement.clientWidth, document.documentElement.clientHeight); //document.body.getBoundingClientRect();
        if (panelContainBounds == null)
            panelContainBounds = new DOMRect(window.scrollX, window.scrollY, window.innerWidth, window.innerHeight);

        let freeOnLeft = alignRect.left - panelContainBounds.left;
        let freeOnRight = panelContainBounds.right - alignRect.right;

        let freeOnTop = alignRect.top - panelContainBounds.top;
        let freeOnBottom = panelContainBounds.bottom - alignRect.bottom;

        let alignOnLeft = freeOnLeft >= panelWidth && freeOnRight < panelWidth;
        let alignOnTop = freeOnTop >= panelHeight && freeOnBottom < panelHeight;

        let left;
        let top;

        if (alignOnLeft)
            left = alignRect.left - panelWidth;
        else
            left = Math.max(Math.min(alignRect.right, panelContainBounds.right - panelWidth), panelContainBounds.left);

        if (alignOnTop)
            top = alignRect.top - panelHeight;
        else
            top = Math.max(Math.min(alignRect.bottom, panelContainBounds.bottom - panelHeight), panelContainBounds.top);
        this.setPositionOnViewport(left, top);
    }

}

// function createPanelFromTemplate(template, view) {

// }

function positionPanel(panel, targetRect, targetMargin = 10, panelContainBounds = null) {
    panel.position(targetRec, targetMargin, panelContainBounds);
}
