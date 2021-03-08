window.e3ds.onEvent("increaseSessionExpireTime", (data) => {
	console.log("Increasing session expire time", data);

	// Example of iframe
	let iframe = document.createElement("iframe");
	iframe.src="http://example.com";
	iframe.classList.add("iframeStyle");
	document.getElementsByTagName("body")[0].append(iframe);

	// Example of a button
	let button1 = document.createElement("button");
	button1.innerText = "Click here";
	document.getElementsByTagName("body")[0].append(button1);
});
