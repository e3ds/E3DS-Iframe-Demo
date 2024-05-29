window.e3ds = {
	// list of event listeners
	events: {},
	onEvent(eventName, callback){
		this.events[eventName] = callback;
	}
};

function HandleResponseFromUE4(jsonObj)//process whatever u want to do with your object
{
	console.log(jsonObj);
	if(window.e3ds.events[jsonObj.cmd]){
		window.e3ds.events[jsonObj.cmd](jsonObj);
	}
}


//eagle3dstreaming's Server   to Iframe communication
const eventHandler = (event) => {
	console.log('Message From SS -- > Iframe  ', event.data);

	if (!event.data.type) // is it a data not from server
	{
		console.log('Message From UE4-- > Iframe  :', event.data);
		if(typeof event.data === 'string' && event.data.includes('cmd')){
			const parsedData = JSON.parse(event.data);
			if (parsedData.cmd){//than is it a data from ue4 ???
				HandleResponseFromUE4(parsedData)//process the data sent by ue4
			}
		}
		
	}
}
window.onload = function(){
	if(!localStorage.getItem("isAuthenticated")){
		window.location.href = "/login.html"
	}
}
window.addEventListener("message", eventHandler);