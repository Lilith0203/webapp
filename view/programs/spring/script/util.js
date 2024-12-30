function selectorUtil(element,pattern){
	if(pattern === undefined){
		return document.querySelector(element);
	}else{
		return element.querySelector(pattern);
	}
}

function getWidth(element){
	var computedStyle = document.defaultView.getComputedStyle(element, null);
	return parseInt(computedStyle.width);
}
function getHeight(element){
	var computedStyle = document.defaultView.getComputedStyle(element, null);
	return parseInt(computedStyle.height);
}
function getTop(element){
    var computedStyle = document.defaultView.getComputedStyle(element, null);
    return parseInt(computedStyle.top);
}
function getLeft(element){
    var computedStyle = document.defaultView.getComputedStyle(element, null);
    return parseInt(computedStyle.left);
}

function getScrollTop(){
	var scrollTop = document.body.scrollTop || (document.documentElement && document.documentElement.scrollTop);
	return scrollTop;
}

function removeClass(item,className){
	var classNames = item.className.split(/\s+/);
	var pos = -1, i, len;
	for (i=0, len=classNames.length; i < len; i++){
        if (classNames[i] == className){
          	pos = i;
          	break;
     	}
	}
	if(i<len){
		classNames.splice(i,1);
		item.className = classNames.join(" ");
	}
}
function addClass(item,className){
    var classes = item.className;
    if(classes.indexOf(className) > -1) {
        return true;
    }
    if(!classes){
        classes=className;
    }else{
        classes = classes + " " + className;
    }
    item.className = classes;
}
function hasClass(item,className){
    if(item.className.indexOf(className) > -1){
        return true;
    }else{
        return false;
    }
}

function getLocalStorage(){
     if (typeof localStorage == "object"){
          return localStorage;
     } else if (typeof globalStorage == "object"){
          return globalStorage[location.host];
     } else {
          throw new Error("Local storage not available.");
     }
}

function supportedAudioFormat(audio) {
    var returnExtension = "";
    if (audio.canPlayType("audio/ogg")) {
        returnExtension = "ogg";
    } else if(audio.canPlayType("audio/mpeg")) {
        returnExtension = "mp3";
    } else if(audio.canPlayType("audio/wav")) {
        returnExtension = "wav";
    }
    return returnExtension;
}