function HandleResponseFromUE4(jsonObj)//process whatever u want to do with your object
{
	console.log(jsonObj);
	const unrealResponseViewer = document.getElementById("unrealResponseViewer");
	if(unrealResponseViewer){
		unrealResponseViewer.textContent = JSON.stringify(jsonObj);
	}
	switch (jsonObj.cmd) {
		case "increaseSessionExpireTime":
			alert(JSON.stringify(jsonObj));
			break;
	
		default:
			break;
	}
}

//eagle3dstreaming's Server   to Iframe communication
const eventHandler = (event) => {
	console.log('Message from E3DS System to iframe :', event.data);
	if (!event.data.type) // data not from server
	{
		console.log('Message from Unreal to iframe :', event.data);
		if(typeof event.data === 'string' && event.data.includes('cmd')){
			const parsedData = JSON.parse(event.data);
			if (parsedData.cmd){//it is a data from unreal
				HandleResponseFromUE4(parsedData)//process the data sent by ue4
			}
		}
		
	}
	else{
		//data sent from server
		messageHandler(event);

	}
}

window.addEventListener("message", eventHandler); //listening to messages sent from the iframe
