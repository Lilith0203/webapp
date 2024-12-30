window.onload=function(){
	var factory1 = selectorUtil("#factory1");
    var factory2 = selectorUtil("#factory2");
    var factory3 = selectorUtil("#factory3");
    var factory2_lock = selectorUtil("#factory2_lock");
    var factory3_lock = selectorUtil("#factory3_lock");
	var storage = getLocalStorage();
    var foot1 = selectorUtil("#foot1");
    var foot2 = selectorUtil("#foot2");

	function show_level2(){
        showFootprint(foot1);
        setTimeout(function(){
            addClass(factory2_lock,"disappear");
            setTimeout(function(){
                factory2_lock.className="hide";
                factory2.getElementsByTagName("a")[0].href="scene2.html";
            },1000);
        },1000);
	}
	function show_level3(){
        showFootprint(foot2);
        setTimeout(function(){
            addClass(factory3_lock,"disappear");
            setTimeout(function(){
                factory3_lock.className="hide";
                factory3.getElementsByTagName("a")[0].href="scene3.html";
            },1000);
        },1000);
	}

	function detLevel(){
		if(storage.level1 == "pass" && storage.level2 != "pass"){
			show_level2();
		}
		if(storage.level2 == "pass" && storage.level3 != "pass"){
            var prints = foot1.getElementsByTagName("div");
            var len = prints.length;
            for(var i=0; i<len;i++){
                prints[i].style.opacity="1";
            }
            factory2_lock.className="hide";
            factory2.getElementsByTagName("a")[0].href="scene2.html";
			show_level3();
		}
        if(storage.level3 == "pass"){
            var prints = foot1.getElementsByTagName("div");
            var len = prints.length;
            for(var i=0; i<len;i++){
                prints[i].style.opacity="1";
            }
            factory2_lock.className="hide";
            factory2.getElementsByTagName("a")[0].href="scene2.html";
            prints = foot2.getElementsByTagName("div");
            len = prints.length;
            for(var i=0; i<len;i++){
                prints[i].style.opacity="1";
            }
            factory3_lock.className="hide";
            factory3.getElementsByTagName("a")[0].href="scene3.html";
        }
	}

    function showFootprint(foot){
        var prints = foot.getElementsByTagName("div");
        var len = prints.length;
        var i = 0;
        setTimeout(function(){
            prints[i].style.opacity="1";
            i++;
            if(i<len){
                setTimeout(arguments.callee,300);
            }
        },300);
    }

	detLevel();
}