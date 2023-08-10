window.e3ds = {
	// list of event listeners
	events: {},
	onEvent(eventName, callback){
		this.events[eventName] = callback;
	}
};

function HandleResponseFromUE4(message)//process whatever u want to do with your object
{
	console.log(message);
}


//eagle3dstreaming's Server   to Iframe communication
const eventHandler = (event) => {
	HandleResponseFromUE4(event.data)
}

window.addEventListener("message", eventHandler);
