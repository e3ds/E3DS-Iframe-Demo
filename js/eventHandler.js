window.e3ds.onEvent("increaseSessionExpireTime", (data) => {
	console.log("Increasing session expire time", data);

	// Example of iframe
	let iframe = document.createElement("iframe");
	iframe.src="http://example.com";
	iframe.classList.add("iframeStyle");
	iframe.style.display = "block";
	document.getElementsByTagName("body")[0].append(iframe);

	// Example of a button
	let button1 = document.createElement("button");
	button1.innerText = "Close Iframe";
	button1.classList.add("closeButtonOfIframe");
	button1.addEventListener("click", (ev) => {
		iframe.style.display = "none";
	});
	document.getElementsByTagName("body")[0].append(button1);
});
