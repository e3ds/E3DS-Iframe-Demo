// https://connector.eagle3dstreaming.com/v5/demo/3DViewer/RobinTesting

const dynamic_url = document.getElementById("dynamic-url");
const submitUrl = document.getElementById("submit-url");
const iframeElem = document.getElementById('iframe_1');

submitUrl.addEventListener("click", (e) => {
    e.preventDefault();
    const url = dynamic_url.value;
    if (url) {
        iframeElem.src = url;
    }
})