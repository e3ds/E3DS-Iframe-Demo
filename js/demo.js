function onPlayBtnPressed() {
	let loaderStep2 = document.getElementById("loaderStep2")
	loaderStep2.style.visibility = "hidden";
	let loaderStep3 = document.getElementById("loaderStep3")
	loaderStep3.style.visibility = "hidden";
	let eleBanner = document.getElementById("iframe_1")
	eleBanner.style.visibility = "visible";
}


function switchTo(val) {
	console.log("=== Registered switchTo action, Value is: ", val);

	let descriptor = {
		Teleport: val
	};
	//emitUIInteraction(descriptor);
	let obj ={
			cmd: "sendToUe4",
			value: descriptor,
	};
	document.getElementById("iframe_1").contentWindow.postMessage(JSON.stringify(obj), "*");
}

let isFullScreen = false

function goToFullScreen() {
	var cmd = isFullScreen ? "Off" : "On";
	isFullScreen = !isFullScreen;
	console.log("=== Registered full screen action, Value is: ", cmd);
	let descriptor = {
		FullScreen: cmd
	};
	//emitUIInteraction(descriptor);
	let obj =
		{
			cmd: "sendToUe4",
			value: descriptor,
		}
	document.getElementById("iframe_1").contentWindow.postMessage(JSON.stringify(obj), "*");
}

	
  const menuToggle = () => {
	const listSidebar = document.getElementById("sidebar");
	const menuButton = document.getElementById("menuButton");
       listSidebar.classList.toggle('show');
       menuButton.classList.toggle('menu-toggle');
}

const toggleSettings = (id)=>{

	let descriptor = {
		id,
		property: 'display',
		value: 'none'
	};
	let obj =
		{
			cmd: "style",
			value: descriptor,
		}
	document.getElementById("iframe_1").contentWindow.postMessage(JSON.stringify(obj), "*");
}

const modalInputFocus = (e)=>{
	e.stopPropagation();
}

const resSubmit = (e)=>{
	e.preventDefault();
	let obj = {
			cmd: "freezeResolutionAt",
			x: e.target.width.value,
			y: e.target.height.value
	}
	document.getElementById("iframe_1").contentWindow.postMessage(JSON.stringify(obj), "*");;
}