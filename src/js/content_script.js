'use strict';

/**
 * Content script injected into all pages
 * Sets up a DOM Mutation Observer which looks for 
 * 'a' tags and adds a click handler to them
 */
(function() {
    var mouseDownPos;
    var mouseDownTimer;
    var forceLeftClickSameTab;

    function setupMutationHelpers(onMouseDown, onMouseUp, onContextMenu) {
        function mutationChecker(nodeList) {
            Array.prototype.forEach.call(nodeList, function(node) {
                if (node instanceof window.HTMLAnchorElement) {
                    node.addEventListener('mouseup', onMouseUp);
                    node.addEventListener('mousedown', onMouseDown);
                    node.addEventListener('contextmenu', onContextMenu);
                }

                if (node.childNodes && node.childNodes.length)
                    mutationChecker(node.childNodes);
            });
        }

        let observer = new MutationObserver(function(records) {
            records.forEach(function(record) {
                mutationChecker(record.addedNodes);
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    };

    function wasDragged(ev) {
        return Math.ceil(ev.screenX - mouseDownPos.x) >= 5 || Math.ceil(ev.screenY - mouseDownPos.y) >= 5;
    };

    function onContextMenu(ev) {
        if (!(ev.altKey || ev.shiftKey || ev.ctrlKey))
            ev.preventDefault();
    };

    function persistTabOnLeftClick(next) {
        if (forceLeftClickSameTab === undefined) {
            return chrome.runtime.sendMessage({ button: 'left' }, function(persistTab) {
                forceLeftClickSameTab = persistTab;
                return next && next(forceLeftClickSameTab);
            });
        }

        return next && next(forceLeftClickSameTab);
    };

    function modifyAnchorElement(node) {
        persistTabOnLeftClick(function(persistTab) {
            if (persistTab)
                node.removeAttribute('target');
        });
    };

    function onMouseDown(ev) {
        mouseDownPos = {
            x: ev.screenX,
            y: ev.screenY
        };

        if (!ev.button)
            modifyAnchorElement(ev.currentTarget);
    };

    function onMouseUp(ev) {
        if (ev.altKey || ev.shiftKey || ev.ctrlKey)
            return;

        if (wasDragged(ev))
            return;

        var clickedButton = [null, 'middle', 'right'][ev.button];
        if (!clickedButton)
            return;

        if (!(ev.currentTarget && ev.currentTarget.href))
            return;

        ev.preventDefault();

        chrome.runtime.sendMessage({
            url: ev.currentTarget.href,
            button: clickedButton
        });
    };

    persistTabOnLeftClick();
    setupMutationHelpers(onMouseDown, onMouseUp, onContextMenu);
})();
