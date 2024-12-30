window.onload=function(){
	var container = selectorUtil("#container");

	var pear = selectorUtil("#pear");
	pear.wid=getWidth(pear);
	pear.hei=getHeight(pear);
    pear.xpos=getLeft(pear);
    pear.ypos=getTop(pear);
	var apple = selectorUtil("#apple");
	apple.wid=getWidth(apple);
	apple.hei=getHeight(apple);
    apple.xpos=getLeft(apple);
    apple.ypos=getTop(apple);
	var blueberry = selectorUtil("#blueberry");
	blueberry.wid=getWidth(blueberry);
	blueberry.hei=getHeight(blueberry);
    blueberry.xpos=getLeft(blueberry);
    blueberry.ypos=getTop(blueberry);
    var green = selectorUtil("#green");
    green.wid=getWidth(green);
    green.hei=getHeight(green);
    green.xpos=getLeft(green);
    green.ypos=getTop(green);
	var rock = selectorUtil("#rock");
	var squeezer = selectorUtil("#squeezer");
    var fruit_array = selectorUtil("#fruit_array");

    var boil = selectorUtil("#boil");
    var fruits = selectorUtil("#fruits");

	var fruit_num=0;
    var red_item = selectorUtil("#red_item");
	var purple_item = selectorUtil("#purple_item");
	var orange_item = selectorUtil("#orange_item");
    var green_item = selectorUtil("#green_item");
    var yellow_item = selectorUtil("#yellow_item");
    var apple_item = selectorUtil("#apple_item");
    var pear_item = selectorUtil("#pear_item");
    var blueberry_item = selectorUtil("#blueberry_item");
    var greeny_item = selectorUtil("#greeny_item");

    var liquid = selectorUtil("#liquid");
    liquid.wid = getWidth(liquid);
    liquid.hei = getHeight(liquid);

	var clown = selectorUtil("#clown");
	var eye = selectorUtil("#eye");
    var paper = selectorUtil("#paper");

	var bubble = selectorUtil("#bubble");
	var people = selectorUtil("#people");
	var start = selectorUtil("#start");
    var remind_container = selectorUtil("#remind_container");
    var tools = selectorUtil("#tools");
    var white = selectorUtil(".white");
    var white_light = selectorUtil("#white_light");

    var bubbles = boil.getElementsByTagName("div");
    var audioType;
    var storage = getLocalStorage();

    var loadCount=0;
    var itemsToLoad = 1;
    function itemLoaded(event) {
        loadCount++;
        if (loadCount >= itemsToLoad) {
            img1.removeEventListener("load",itemLoaded);
            //music1.removeEventListener("canplaythrough",itemLoaded);
            addClass(loading,"hide");
        }
    }

    var img1 = document.createElement("img");
    img1.src="image/scene2.png";
    img1.addEventListener("load",itemLoaded);

    var music1 = document.createElement("audio");
    //music1.addEventListener("canplaythrough",itemLoaded);
    audioType = supportedAudioFormat(music1);
    document.body.appendChild(music1);
    music1.setAttribute("src","music/bubble." + audioType);
    music1.setAttribute("loop", "true");
    var squeeze_sound = document.createElement("audio");
    squeeze_sound.setAttribute("src","music/squeeze." + audioType);
    squeeze_sound.setAttribute("loop", "true");

    function ani_bubbles(){
        var len = bubbles.length;
        for(i=0; i < len; i++){
            var bubble = bubbles[i];
            bubble.dx= 10 + Math.floor(Math.random()*20);
            bubble.dy=30;
            bubble.xpos = getLeft(bubble);
            bubble.ypos = getTop(bubble);
        }
        update_bubble();
    }
    ani_bubbles();
    function update_bubble(){
        setInterval(function(){
            var len = bubbles.length;
            for(i=0; i < len; i++){
                var bubble = bubbles[i];
                bubble.xpos += (Math.random()*2-1)*bubble.dx;
                bubble.ypos -= bubble.dy;
                if(bubble.xpos < 0){
                    bubble.xpos = 0;
                }
                if(bubble.xpos > 250){
                    bubble.xpos = 220;
                }
                if(bubble.ypos < 0){
                    bubble.ypos = 240;
                }
                bubble.style.left = bubble.xpos + "px";
                bubble.style.top = bubble.ypos + "px";
            }
        },500);
    }

    function selectFruit(event){
        var xpos = event.pageX-container.offsetLeft;
        var ypos = event.pageY;
        pear.style.backgroundPosition="left";
        apple.style.backgroundPosition="left";
        blueberry.style.backgroundPosition="left";
        green.style.backgroundPosition="left";
        pear.style.zIndex="";
        apple.style.zIndex="";
        blueberry.style.zIndex="";
        green.style.zIndex="";
        if(xpos>pear.xpos && xpos<pear.xpos+pear.wid && ypos>pear.ypos && ypos<pear.ypos+pear.hei){
            pear.style.backgroundPosition="right";
            pear.style.zIndex="4";
        }
        if(xpos>apple.xpos && xpos<apple.xpos+apple.wid && ypos>apple.ypos && ypos<apple.ypos+apple.hei){
            apple.style.backgroundPosition="right";
            apple.style.zIndex="4";
        }
        if(xpos>blueberry.xpos && xpos<blueberry.xpos+blueberry.wid && ypos>blueberry.ypos && ypos<blueberry.ypos+blueberry.hei){
            blueberry.style.backgroundPosition="right";
            blueberry.style.zIndex="4";
        }
        if(xpos>green.xpos && xpos<green.xpos+green.wid && ypos>green.ypos && ypos<green.ypos+green.hei){
            green.style.backgroundPosition="right";
            green.style.zIndex="4";
        }
    }
    fruits.addEventListener("mousemove",selectFruit);

    function getFruits(event){
        var fruit_id = event.target.id;
        switch(fruit_id){
            case "apple":
                addClass(apple,"hide");
                removeClass(apple_item,"hide");
                fruit_num++;
            break;
            case "pear":
                addClass(pear,"hide");
                removeClass(pear_item,"hide");
                fruit_num++;
            break;
            case "blueberry":
                addClass(blueberry,"hide");
                removeClass(blueberry_item,"hide");
                fruit_num++;
            break;
            case "green":
                addClass(green,"hide");
                removeClass(greeny_item,"hide");
                fruit_num++;
            break;
        }
        if(fruit_num>=4){
            fruits.removeEventListener("mousemove",selectFruit);
            window.removeEventListener("click",getFruits);
        }
    }
    window.addEventListener("click",getFruits);

    function putFruit(event){
        event.stopPropagation();
        var fruit = event.target;
        if(!hasClass(fruit,"fruita")){
            return;
        }
        fruit.addEventListener("click",removeFruit);
        fruit.style.opacity="1";
        fruit.select = true;
        //setTimeout(function(){
            //fruit.addEventListener("click",removeFruit);
        //},100);
    }
    function removeFruit(event){
        event.stopPropagation();
        var fruit = event.target;
        if(!hasClass(fruit,"fruita")){
            return;
        }
        //setTimeout(function(){
            fruit.removeEventListener("click",removeFruit);
        //},100);
        fruit.style.opacity="";
        fruit.select = false;
    }

    function squeeze(){
        if(blueberry_item.select && !pear_item.select && !apple_item.select && !greeny_item.select){
            if(hasClass(purple_item,"hide")) {
                removeClass(purple_item,"hide");
                purple_item.addEventListener("click",useLiquid);
                return "purple";
            }
        }
        if(greeny_item.select && !pear_item.select && !blueberry_item.select && !apple_item.select){
            if(hasClass(green_item,"hide")) {
                removeClass(green_item,"hide");
                green_item.addEventListener("click",useLiquid);
                return "green";
            }
        }
        if(pear_item.select && !greeny_item.select && !blueberry_item.select && !apple_item.select){
            if(hasClass(yellow_item,"hide")) {
                removeClass(yellow_item,"hide");
                yellow_item.addEventListener("click",useLiquid);
                return "yellow";
            }
        }
        if(!pear_item.select && !greeny_item.select && !blueberry_item.select && apple_item.select){
            if(hasClass(red_item,"hide")) {
                removeClass(red_item,"hide");
                red_item.addEventListener("click",useLiquid);
                return "red";
            }
        }
        if(pear_item.select && !greeny_item.select && !blueberry_item.select && apple_item.select){
            if(hasClass(orange_item,"hide")) {
                removeClass(orange_item,"hide");
                orange_item.addEventListener("click",useLiquid);
                return "orange";
            }
        }
        return "";
    }

	function pull(event){
        event.stopPropagation();
		rock.className="pull_down";
		rolling();
        if(storage.muse=="false"){
            squeeze_sound.play();
        }
		var color = squeeze();
		setTimeout(function(){
			rock.className="";
            if(storage.muse=="false"){
                squeeze_sound.pause();
            }
		},250);
		if(color){
			setTimeout(function(){
				remind(color);
			},1000);
		}
	}

	function rolling(){
		var i = 0;
		setTimeout(function(){
			squeezer.style.backgroundPosition="left";
			if(i < 3){
				setTimeout(arguments.callee,500);
			}
			i++;
		},500);
		setTimeout(function(){
			squeezer.style.backgroundPosition="right";
			if(i < 3){
				setTimeout(arguments.callee,500);
			}
		},250);
	}

    function remind(item){
        removeClass(remind_container,"hide");
        var p = remind_container.getElementsByTagName("p").item(0);
        var pic = selectorUtil("#pic");
        switch(item){
            case "red":
                p.innerHTML="你得到红色药水~";
                pic.style.backgroundPosition="-600px";
            break;
            case "yellow":
                p.innerHTML="你得到黄色药水~";
                pic.style.backgroundPosition="-400px";
            break;
            case "purple":
                p.innerHTML="你得到紫色药水~";
                pic.style.backgroundPosition="0px";
            break;
            case "green":
                p.innerHTML="你得到绿色药水~";
                pic.style.backgroundPosition="-200px";
            break;
            case "orange":
                p.innerHTML="你得到橙色药水~";
                pic.style.backgroundPosition="-800px";
            break;
        }
        pic.className="tada";
        setTimeout(function(){
            pic.className="";
        },700);
        setTimeout(function(){
            addClass(remind_container,"hide");
            addClass(tools,"tool_slide");
            setTimeout(function(){
                removeClass(tools,"tool_slide");
            },2000);
        },1400);
    }

    liquid.color="";
    eye.color="purple";
    /*purple_item.addEventListener("click",useLiquid);*/
    function useLiquid(event){
        var color_id = event.target.id;
        switch(color_id){
        case "purple_item":
            liquid.style.backgroundPosition="0";
            liquid.color="purple";
        break;
        case "green_item":
            liquid.style.backgroundPosition="-200px";
            liquid.color="green";
        break;
        case "yellow_item":
            liquid.style.backgroundPosition="-400px";
            liquid.color="yellow";
            break;
        case "red_item":
            liquid.style.backgroundPosition="-600px";
            liquid.color="red";
            break;
        case "orange_item":
            liquid.style.backgroundPosition="-800px";
            liquid.color="orange";
            break;
        }
        liquid_use(event);
    }

     function liquid_use(event){
         liquid.still=false;
         liquid.style.opacity="0.5";
         liquid.style.zIndex="11";
         liquid.style.left=event.pageX-container.offsetLeft-.5*liquid.wid + "px";
         liquid.style.top=event.pageY-.5*liquid.hei + "px";
         removeClass(liquid,"hide");
         window.addEventListener("mousemove",liquid_move);
         setTimeout(function(){
            window.addEventListener("click",liquid_still);
         },100);
     }

     function liquid_move(event){
         liquid.xPos=event.pageX-container.offsetLeft;
         liquid.yPos=event.pageY;
         liquid.style.left=liquid.xPos-.5*liquid.wid + "px";
         liquid.style.top=liquid.yPos-.5*liquid.hei + "px";
         if(liquid.color == eye.color && liquid.xPos>150 && liquid.xPos<470 && liquid.yPos>420 && liquid.yPos<530){
             liquid.style.opacity="1";
             liquid.still=true;
         }else{
             liquid.style.opacity="0.5";
             liquid.still=false;
         }
     }

    function liquid_still() {
        window.removeEventListener("click", liquid_still);
        window.removeEventListener("mousemove", liquid_move);
        if(liquid.still) {
            liquid.style.left = "400px";
            liquid.style.top = "450px";
            eyeChange();
            setTimeout(function(){
                addClass(liquid,"hide");
            },1000);
        }else{
            addClass(liquid,"hide");
        }
    }

    function eyeChange(){
        switch(eye.color) {
            case "purple":
                eye.className = "green";
                eye.color = "green";
                break;
            case "green":
                eye.className = "yellow";
                eye.color = "yellow";
                break;
            case "yellow":
                eye.className = "red";
                eye.color = "red";
                break;
            case "red":
                eye.className = "orange";
                eye.color = "orange";
            break;
            case "orange":
                setTimeout(ani_end,1000);
            break;
        }
    }
    /*eyeChange();*/
    function ani_end(){
        removeClass(white_light,"hide");
        removeClass(white,"hide");
        setTimeout(function(){
            addClass(white,"bright");
        },1000);
        setTimeout(function(){
            var storage=getLocalStorage();
            storage.setItem("level2","pass");
            location.href="select.html";
        },3600);
    }

    function speak(event,i){
        var ps = bubble.getElementsByTagName("p");
        if(i<2){
            ps[i].className="hide";
            ps[i+1].className="";
            i++;
        }else if(i==2){
            addClass(start,"remove");
            setTimeout(function(){
                start.className="hide";
                if(storage.muse == "false") {
                    music1.play();
                }
            },600);
        }
    }
	var begin=function(){
		var i = 0;
		bubble.addEventListener("click",function(event){
			speak(event,i);
			i++;
		});
	}();

	rock.addEventListener("click",pull);
    paper.addEventListener("click",function(){
        if(hasClass(paper,"paper_open")){
            removeClass(paper,"paper_open");
        }else{
            addClass(paper,"paper_open");
        }
    });
    fruit_array.addEventListener("click",putFruit);
}