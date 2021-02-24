import { appendToMeasurementContainer, removeFromMeasurementContainer } from './dom';

/**
 * These variables are lazy loaded, as otherwise they try and get initialised when we are loading
 * unit tests and we don't have references to window or document in the unit tests
 * from http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
 */
let isSafari: boolean;
let isIE: boolean;
let isEdge: boolean;
let isChrome: boolean;
let isFirefox: boolean;
let isIOS: boolean;

export function isBrowserIE(): boolean {
    if (isIE === undefined) {
        isIE = /*@cc_on!@*/false || !!(document as any).documentMode; // At least IE6
    }

    return isIE;
}

export function isBrowserEdge(): boolean {
    if (isEdge === undefined) {
        isEdge = !isBrowserIE() && !!(window as any).StyleMedia;
    }

    return isEdge;
}

export function isBrowserSafari(): boolean {
    if (isSafari === undefined) {
        // taken from https://stackoverflow.com/a/23522755/1388233
        isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    }

    return isSafari;
}

export function isBrowserChrome(): boolean {
    if (isChrome === undefined) {
        const win = window as any;
        isChrome = (!!win.chrome && (!!win.chrome.webstore || !!win.chrome.runtime)) ||
            (/Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor));
    }

    return isChrome;
}

export function isBrowserFirefox(): boolean {
    if (isFirefox === undefined) {
        const win = window as any;

        isFirefox = typeof win.InstallTrigger !== 'undefined';
    }

    return isFirefox;
}

export function isIOSUserAgent(): boolean {
    if (isIOS === undefined) {
        // taken from https://stackoverflow.com/a/58064481/1388233
        isIOS = (/iPad|iPhone|iPod/.test(navigator.platform) ||
            // eslint-disable-next-line
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
            !window.MSStream;
    }

    return isIOS;
}

export function getTabIndex(el: HTMLElement): string | null {
    if (!el) { return null; }

    const numberTabIndex = el.tabIndex;
    const tabIndex = el.getAttribute('tabIndex');

    if (isBrowserIE() && numberTabIndex === 0 && tabIndex === null) {
        const map: { [key: string]: boolean; } = {
            a: true,
            body: true,
            button: true,
            frame: true,
            iframe: true,
            img: true,
            input: true,
            isindex: true,
            object: true,
            select: true,
            textarea: true
        };

        return map[el.nodeName.toLowerCase()] === true ? '0' : null;
    }

    if (numberTabIndex === -1 && (tabIndex === null || (tabIndex === '' && !isBrowserFirefox()))) {
        return null;
    }

    return numberTabIndex.toString();
}

export function getMaxDivHeight(): number {
    if (!document.body) { return -1; }

    let res = 1000000;
    // FF reports the height back but still renders blank after ~6M px
    const testUpTo = navigator.userAgent.toLowerCase().match(/firefox/) ? 6000000 : 1000000000;
    const div = document.createElement('div');
    appendToMeasurementContainer(div);

    while (true) {
        const test = res * 2;
        div.style.height = test + 'px';

        if (test > testUpTo || div.clientHeight !== test) {
            break;
        } else {
            res = test;
        }
    }

    removeFromMeasurementContainer(div);

    return res;
}

export function getScrollbarWidth(): number | null {
    const div = document.createElement('div');

    div.style.width = div.style.height = '100px';
    div.style.opacity = '0';
    div.style.overflow = 'scroll';
    (div.style as any).msOverflowStyle = 'scrollbar'; // needed for WinJS apps
    div.style.position = 'absolute';

    appendToMeasurementContainer(div);

    const width = div.offsetWidth - div.clientWidth;

    // if width is 0 and client width is 0, means the DOM isn't ready
    if (width === 0 && div.clientWidth === 0) { return null; }

    // remove divs
    if (div.parentNode) {
        div.parentNode.removeChild(div);
    }

    return width;
}

/** @deprecated */
export function hasOverflowScrolling(): boolean {
    const prefixes: string[] = ['webkit', 'moz', 'o', 'ms'];
    const div: HTMLElement = document.createElement('div');
    let found: boolean = false;
    let p: string;

    appendToMeasurementContainer(div);
    div.setAttribute('style', prefixes.map(prefix => `-${prefix}-overflow-scrolling: touch`).concat('overflow-scrolling: touch').join(';'));

    const computedStyle: CSSStyleDeclaration = window.getComputedStyle(div);

    if ((computedStyle as any).overflowScrolling === 'touch') {
        found = true;
    }

    if (!found) {
        for (p of prefixes) {
            if ((computedStyle as any)[`${p}OverflowScrolling`] === 'touch') {
                found = true;
                break;
            }
        }
    }

    if (div.parentNode) {
        div.parentNode.removeChild(div);
    }

    return found;
}

/**
 * Gets the document body width
 * from: http://stackoverflow.com/questions/1038727/how-to-get-browser-width-using-javascript-code
 * @returns {number}
 */
export function getBodyWidth(): number {
    if (document.body) {
        return document.body.clientWidth;
    }

    if (window.innerHeight) {
        return window.innerWidth;
    }

    if (document.documentElement && document.documentElement.clientWidth) {
        return document.documentElement.clientWidth;
    }

    return -1;
}

/**
 * Gets the body height
 * from: http://stackoverflow.com/questions/1038727/how-to-get-browser-width-using-javascript-code
 * @returns {number}
 */
export function getBodyHeight(): number {
    if (document.body) {
        return document.body.clientHeight;
    }

    if (window.innerHeight) {
        return window.innerHeight;
    }

    if (document.documentElement && document.documentElement.clientHeight) {
        return document.documentElement.clientHeight;
    }

    return -1;
}
