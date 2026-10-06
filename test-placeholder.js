const { JSDOM } = require("jsdom");
const dom = new JSDOM('<input id="i" placeholder="foo" data-i18n-placeholder="key" />');
const el = dom.window.document.getElementById("i");
el.placeholder = "bar";
console.log(el.outerHTML);
console.log(el.placeholder);
