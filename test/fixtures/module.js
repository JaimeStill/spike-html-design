// module: the harness's cross-origin module fixture. module.html imports it from a jsDelivr URL
// the test intercepts; it marks the page, so the test sees that it ran.
document.querySelector("p").textContent = "module ran";
