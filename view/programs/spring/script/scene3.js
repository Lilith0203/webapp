window.onload=function(){
	var container = selectorUtil("#container");
    var door = selectorUtil("#door");

	var picture = selectorUtil("#picture");
    var pic_tip = selectorUtil("#pic_tip");

    var case_open = selectorUtil("#case");
    var case_tip = selectorUtil("#case_tip");
    var case_code = selectorUtil("#case_code");
    var tip_item = selectorUtil("#tip_item");

    var drawer = selectorUtil("#drawer");
    var envelope = selectorUtil("#envelope");
    var envelope_item=selectorUtil("#enve_item");

    var door_code = selectorUtil("#door_code");

    var key = selectorUtil("#key");
	var key_item=selectorUtil("#key_item");
    key.wid = getWidth(key);
    key.hei = getHeight(key);

    var pass_container = selectorUtil("#pass_container");
    var password = selectorUtil("#password");
    var open = selectorUtil("#open");

    var tip_show = selectorUtil("#tip_show");
    var tip = selectorUtil("#tip");
    var card = selectorUtil("#card");

	var bubble = selectorUtil("#bubble");
	var people = selectorUtil("#people");
	var start = selectorUtil("#start");
    var remind_container = selectorUtil("#remind_container");
    var tip_pic = selectorUtil("#tip_pic");
    var tools = selectorUtil("#tools");
    var white = selectorUtil(".white");

    var storage = getLocalStorage();
    var audioType;

    var loadCount=0;
    var itemsToLoad = 2;
    function itemLoaded(event) {
        loadCount++;
        if (loadCount >= itemsToLoad) {
            img1.removeEventListener("load",itemLoaded);
            img2.removeEventListener("load",itemLoaded);
            addClass(loading,"hide");
        }
    }

    var img1 = document.createElement("img");
    img1.src="image/scene3.png";
    img1.addEventListener("load",itemLoaded);
    var img2 = document.createElement("img");
    img2.src="image/over.png";
    img2.addEventListener("load",itemLoaded);

    var door_sound = document.createElement("audio");
    //music1.addEventListener("canplaythrough",itemLoaded);
    audioType = supportedAudioFormat(door_sound);
    door_sound.setAttribute("src","music/open_door." + audioType);

    case_code.addEventListener("click",putInCode);
    door_code.addEventListener("click",putInCode);

    function changeNum(event){
        var target = event.target.parentNode;
        target.n+=1;
        if(target.n == 10){
            target.n=0;
        }
        target.style.top = -target.n*290 + "px";
        checkCode();
    }
    var passId;
    function putInCode(event){
        var target_id = event.target.id;
        if(target_id == "door_code"){
            passId="door";
        }else{
            passId="case";
        }
        removeClass(pass_container,"hide");
        var nums = password.getElementsByTagName("ul");
        var close = selectorUtil(password,".close");
        var len=nums.length;
        for(var i=0;i<len;i++){
            nums[i].n=0;
            nums[i].style.top = 0 + "px";
            nums[i].addEventListener("click",changeNum);
        }
        close.addEventListener("click",closePass);
    }
    function closePass(){
        addClass(pass_container,"hide");
    }

    function checkCode(){
        var nums = pass_container.getElementsByTagName("ul");
        if(passId=="case" && nums[0].n==5 && nums[1].n==7 && nums[2].n==3 && nums[3].n==9){
            addClass(open,"right");
            open.addEventListener("click",openCase);
            case_open.open = true;
            open.style.cursor="pointer";
        }else if(case_open.open && passId=="door" && nums[0].n==4 && nums[1].n==4 && nums[2].n==4 && nums[3].n==5){
            addClass(open,"right");
            open.style.cursor="pointer";
            open.addEventListener("click",openDoor);
        }else{
            removeClass(open,"right");
            open.style.cursor="";
            open.onclick = null;
        }
    }

    function openDoor(){
        removeClass(door,"hide");
        if(storage.muse == "false") {
            door_sound.play();
        }
        removeClass(white,"hide");
        addClass(pass_container,"hide");
        setTimeout(function(){
            addClass(white,"bright");
        },1000);
        setTimeout(function(){
            storage.setItem("level3","pass");
            location.href="over.html";
        },3000);
    }
    function openCase(){
        removeClass(open,"right");
        open.style.cursor="";
        open.removeEventListener("click",openCase);
        addClass(pass_container,"hide");
        removeClass(case_open,"hide");
        case_code.removeEventListener("click",putInCode);
        case_tip.addEventListener("click", getTip);
    }
    function getTip(){
        addClass(case_open,"hide");
        remind("tip");
        removeClass(tip_item,"hide");
        tip_item.addEventListener("click",tipUse);
    }
    function tipUse(){
        removeClass(tip_show,"hide");
        var p = tip_show.getElementsByTagName("p").item(0);
        p.innerHTML="这是张提示卡~";
        addClass(card,"hide");
        removeClass(tip,"hide");
        var close = selectorUtil(tip_show,".close");
        close.addEventListener("click",closeTip);
    }

    function remind(item){
        removeClass(remind_container,"hide");
        var p = remind_container.getElementsByTagName("p").item(0);
        var pic = selectorUtil("#pic");
        switch(item){
            case "key":
                p.innerHTML="你得到一把钥匙~";
                pic.style.backgroundImage="url(image/key.png)";
                addClass(tip_pic,"hide");
                break;
            case "tip":
                p.innerHTML="你得到一张提示卡~";
                pic.style.backgroundImage="";
                removeClass(tip_pic,"hide");
                break;
            case "envelope":
                p.innerHTML="你得到一个信封~";
                pic.style.backgroundImage="url(image/envelope.png)";
                addClass(tip_pic,"hide");
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

    function getPic(){
        var close = selectorUtil(pic_tip,".close");
        removeClass(pic_tip,"hide");
        close.addEventListener("click",closePic);
    }
    function closePic(){
        addClass(pic_tip,"hide");
    }

    function getKey(){
        removeClass(key_item,"hide");
        addClass(key,"hide");
        remind("key");
        key.removeEventListener("click",getKey);
        key_item.addEventListener("click",keyUse);
    }

    function keyUse(event){
        key.still = false;
        key.style.opacity="0.5";
        key.style.zIndex="11";
        key.style.left=event.pageX-container.offsetLeft-.5*key.wid + "px";
        key.style.top=event.pageY-.5*key.hei + "px";
        removeClass(key,"hide");
        window.addEventListener("mousemove",keyMove);
        setTimeout(function(){
            window.addEventListener("click",keyStill);
        },100);
    }

    function keyMove(event){
        key.xPos=event.pageX-container.offsetLeft;
        key.yPos=event.pageY;
        key.style.left=key.xPos-.5*key.wid + "px";
        key.style.top=key.yPos-.5*key.hei + "px";
        key.style.backgroundPosition="left";
        if(key.xPos>960 && key.xPos<995 && key.yPos>340 && key.yPos<380){
            key.style.opacity="1";
            key.still=true;
        }else{
            key.style.opacity="0.5";
            key.still=false;
        }
    }

    function keyStill() {
        window.removeEventListener("click", keyStill);
        window.removeEventListener("mousemove", keyMove);
        if(key.still) {
            openDrawer();
        }
        addClass(key,"hide");
    }

    function getEnvelope(){
        addClass(drawer,"hide");
        remind("envelope");
        removeClass(envelope_item,"hide");
        envelope_item.addEventListener("click",enveUse);
        key_item.removeEventListener("click",keyUse);
    }
    function enveUse(){
        removeClass(tip_show,"hide");
        var p = tip_show.getElementsByTagName("p").item(0);
        p.innerHTML="信封里有一些卡牌~";
        addClass(tip,"hide");
        removeClass(card,"hide");
        var close = selectorUtil(tip_show,".close");
        close.addEventListener("click",closeTip);
    }
    function closeTip(){
        addClass(tip_show,"hide");
    }

    function openDrawer(){
        removeClass(drawer,"hide");
        envelope.addEventListener("click",getEnvelope);
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

    key.addEventListener("click",getKey);
    picture.addEventListener("click",getPic);
}