// Copyright 1998-2019 Epic Games, Inc. All Rights Reserved.


function handleRespFunction(data) {
	switch (data) {
		case "BodySelected":
			alert('Recieved BodySelected response event');
			break;
		case "NoseSelected":
			alert('Recieved NoseSelected response event');
			break;
		case data.substring("1080p"):
			// UE4 only supports up to 1080p, not 4K.
			console.log("Disabling 4k button");
			let button4K = document.getElementById("4k");
			button4K.disabled = true;
			button4K.title = "4K is supported only when -NvEncH264ConfigLevel=NV_ENC_LEVEL_H264_52 UE4 is added to UE4 command line";
			break;
		default:
			break;
	}
	// if (data.substring("1080p")) {
	// 	// UE4 only supports up to 1080p, not 4K.
	// 	console.log("Disabling 4k button");
	// 	let button4K = document.getElementById("4k");
	// 	button4K.disabled = true;
	// 	button4K.title = "4K is supported only when -NvEncH264ConfigLevel=NV_ENC_LEVEL_H264_52 UE4 is added to UE4 command line";
	// }
}

var grabStyle = 'cursor: default; ';   // We will have a browser side grab cursor.
var isFullscreen = false;

function onParagonLoad() {
	styleAdditional = grabStyle;
	inputOptions.controlScheme = ControlSchemeType.HoveringMouse;
	inputOptions.fakeMouseWithTouches = false;
	// styleWidth = 700;
	// styleHeight = 394;

	if (document.addEventListener) {
		document.addEventListener('webkitfullscreenchange', onFullscreenChange, false);
		document.addEventListener('mozfullscreenchange', onFullscreenChange, false);
		document.addEventListener('fullscreenchange', onFullscreenChange, false);
		document.addEventListener('MSFullscreenChange', onFullscreenChange, false);
	}

	let fullscreenCheck = document.getElementById('ck-fullscreen');
	if (fullscreenCheck) {
		fullscreenCheck.onclick = function () {
			if (!isFullscreen) {
				enterFullscreen();
			} else {
				exitFullscreen();
			}
		};
	}

	// When the data channel is connected we want to ask UE4 if 4K is supported.
	onDataChannelConnected = function () {
		emitUIInteraction("4K");
	};
	addResponseEventListener("handle_responses", handleRespFunction);
}

function onFullscreenChange(data) {
	var fullscreenDiv = document.getElementById("player");
	isFullscreen = (document.webkitIsFullScreen
		|| document.mozFullScreen
		|| (document.msFullscreenElement && document.msFullscreenElement !== null)
		|| (document.fullscreenElement && document.fullscreenElement !== null)
		|| (fullscreenDiv && fullscreenDiv.classList.contains("fullscreen")));

	let fullscreenImg = document.getElementsByClassName('footer-icon');
	if (fullscreenImg.length) {
		if (isFullScreen) {
			fullscreenImg[0].classList.add('minimize-icon');
			fullscreenImg[0].classList.remove('fullscreen-icon');
		} else {
			fullscreenImg[0].classList.add('fullscreen-icon');
			fullscreenImg[0].classList.remove('minimize-icon');
		}
	}
}

function enterFullscreen() {
	var fullscreenDiv = document.getElementById("player");
	var textDivs = document.getElementsByClassName("text");
	var headerDiv = document.getElementById("header-tbl");
	var fullscreenFunc = fullscreenDiv.requestFullscreen;

	if (!fullscreenFunc) {
		['mozRequestFullScreen',
			'msRequestFullscreen',
			'webkitRequestFullScreen'].forEach(function (req) {
			fullscreenFunc = fullscreenFunc || fullscreenDiv[req];
		});
	}

	if (fullscreenFunc) {
		fullscreenFunc.call(fullscreenDiv);
	} else {
		//No Fullscreen api so maximise video to window size
		if (fullscreenDiv) {
			fullscreenDiv.classList.add("fullscreen");
			fullscreenDiv.classList.remove("fixed-size");
		}

		if (textDivs) {
			for (let i = 0; i < textDivs.length; i++) {
				textDivs[i].style.display = "none";
			}
		}

		if (headerDiv)
			headerDiv.style.display = "none";

		onFullscreenChange({});
		onInPageFullscreen();
	}
}

function exitFullscreen() {
	var fullscreenDiv = document.getElementById("player");
	var textDivs = document.getElementsByClassName("text");
	var headerDiv = document.getElementById("header-tbl");
	var exitFullscreenFunc = document.exitFullscreen;

	if (!exitFullscreenFunc) {
		['mozCancelFullScreen',
			'msExitFullscreen',
			'webkitExitFullscreen'].forEach(function (req) {
			exitFullscreenFunc = exitFullscreenFunc || document[req];
		});
	}

	if (exitFullscreenFunc) {
		exitFullscreenFunc.call(document);
	} else {
		//No Fullscreen api so shrink video back from max window size
		if (fullscreenDiv) {
			fullscreenDiv.classList.remove("fullscreen");
			fullscreenDiv.classList.add("fixed-size");
			fullscreenDiv.style.left = "";
		}

		if (textDivs) {
			for (let i = 0; i < textDivs.length; i++) {
				textDivs[i].style.display = "block";
			}
		}

		if (headerDiv)
			headerDiv.style.display = "table";

		onFullscreenChange({});
		onInPageFullscreen();
	}
}

function onInPageFullscreen() {
	var playerElement = document.getElementById('player');
	let videoElement = playerElement.getElementsByTagName("VIDEO");
	document.documentElement.style.position = isFullscreen ? "fixed" : "";
	document.body.style.position = isFullscreen ? "fixed" : "";

	if (isFullscreen) {
		let windowAspectRatio = window.innerHeight / window.innerWidth;
		let playerAspectRatio = playerElement.clientHeight / playerElement.clientWidth;
		// We want to keep the video ratio correct for the video stream
		let videoAspectRatio = videoElement.videoHeight / videoElement.videoWidth;

		if (isNaN(videoAspectRatio)) {
			//Video is not initialised yet so set playerElement to size of window
			styleWidth = window.innerWidth;
			styleHeight = window.innerHeight;
			styleTop = 0;
			styleLeft = Math.floor((window.innerWidth - styleWidth) * 0.5);
			//Video is now 100% of the playerElement so set the playerElement style
			playerElement.style.width = styleWidth + "px";
			playerElement.style.height = styleHeight + "px";
		} else if (windowAspectRatio < playerAspectRatio) {
			styleWidth = Math.floor(window.innerHeight / videoAspectRatio);
			styleHeight = window.innerHeight;
			styleTop = 0;
			styleLeft = Math.floor((window.innerWidth - styleWidth) * 0.5);
			//Video is now 100% of the playerElement so set the playerElement style
			playerElement.style.width = styleWidth + "px";
			playerElement.style.height = styleHeight + "px";
		} else {
			styleWidth = window.innerWidth;
			styleHeight = Math.floor(window.innerWidth * videoAspectRatio);
			styleTop = Math.floor((window.innerHeight - styleHeight) * 0.5);
			styleLeft = 0;
			//Video is now 100% of the playerElement so set the playerElement style
			playerElement.style.width = styleWidth + "px";
			playerElement.style.height = styleHeight + "px";
		}

	} else {
		playerElement.style.height = "";
		playerElement.style.width = "";
	}
}

