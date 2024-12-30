window.onload=function(){
    var sound = selectorUtil("#sound");
    var help = selectorUtil("#help");
    var help_tips = selectorUtil("#help_tips");
    var close = selectorUtil("#close");
    var muse = selectorUtil("#muse");

    var left_tree = selectorUtil("#left_tree");
    var right_tree = selectorUtil("#right_tree");
    var black = selectorUtil(".black");
    var ani_two = selectorUtil("#ani_two");
    var ball = selectorUtil("#ball");
    var purplewind = selectorUtil("#purplewind");
    var loading = selectorUtil("#loading");
    var cloud = selectorUtil("#cloud");
    var white = selectorUtil(".white");
    var ani_container = selectorUtil("#ani_container");
    var audioType;

    var loadCount=0;
    var itemsToLoad = 7;
    function itemLoaded(event) {
        loadCount++;
        if (loadCount >= itemsToLoad) {
            img1.removeEventListener("load",itemLoaded);
            img2.removeEventListener("load",itemLoaded);
            img3.removeEventListener("load",itemLoaded);
            img4.removeEventListener("load",itemLoaded);
            img5.removeEventListener("load",itemLoaded);
            img6.removeEventListener("load",itemLoaded);
            img7.removeEventListener("load",itemLoaded);
            //music1.removeEventListener("canplaythrough",itemLoaded);
            addClass(loading,"hide");
            open_ani();
        }
    }

    var img1 = document.createElement("img");
    img1.src="image/ani_one.png";
    img1.addEventListener("load",itemLoaded);
    var img2 = document.createElement("img");
    img2.src="image/ani_two.png";
    img2.addEventListener("load",itemLoaded);
    var img3 = document.createElement("img");
    img3.src="image/index.png";
    img3.addEventListener("load",itemLoaded);
    var img4 = document.createElement("img");
    img4.src="image/cloud.png";
    img4.addEventListener("load",itemLoaded);
    var img5 = document.createElement("img");
    img5.src="image/wind.png";
    img5.addEventListener("load",itemLoaded);
    var img6 = document.createElement("img");
    img6.src="image/ball.png";
    img6.addEventListener("load",itemLoaded);
    var img7 = document.createElement("img");
    img7.src="image/select.png";
    img7.addEventListener("load",itemLoaded);
    var img8 = document.createElement("img");
    img8.src="image/factory1.png";
    var img9 = document.createElement("img");
    img9.src="image/factory2.png";
    var img10 = document.createElement("img");
    img10.src="image/factory3.png";
    var music1 = document.createElement("audio");
    document.body.appendChild(music1);
    //music1.addEventListener("canplaythrough",itemLoaded);
    audioType = supportedAudioFormat(music1);
    music1.setAttribute("src","music/bg." + audioType);
    music1.loop=true;
    var music2 = document.createElement("audio");
    music2.setAttribute("src","music/bird." + audioType);

    function open_ani(){
        addClass(left_tree,"left_in");
        addClass(right_tree,"right_in");
        addClass(cloud,"bounceIn");
        music2.play();
        cloud.getElementsByTagName("p")[0].className="show";
        setTimeout(function(){
            addClass(ani_two,"flash");
            setTimeout(function(){
                animation_two();
            },1000);
        },6500)
    }
    function animation_two(){
        addClass(ball,"rotateIn");
        addClass(purplewind,"flash");
        ball.getElementsByTagName("p")[0].className="show";
        setTimeout(function(){
            addClass(white,"show");
            setTimeout(function(){
                removeClass(white,"show");
                addClass(ani_container,"hide");
                setTimeout(function(){
                    addClass(white,"hide");
                    music1.play();
                },600);
            },600);
        },4500);
    }

    function showHelp(event){
        event.preventDefault();
        addClass(help_tips,"enlarge");
    }
    function closeHelp(event){
        removeClass(help_tips,"enlarge");
    }
    var storage=getLocalStorage();
    storage.setItem("muse","false");
    function soundOff(event){
        event.preventDefault();
        removeClass(muse,"hide");
        sound.removeEventListener("click",soundOff);
        sound.addEventListener("click",soundOn);
        music1.pause();
        storage.setItem("muse","true");
    }
    function soundOn(event){
        event.preventDefault();
        addClass(muse,"hide");
        sound.addEventListener("click",soundOff);
        sound.removeEventListener("click",soundOn);
        music1.currentTime=0;
        music1.play();
        storage.setItem("muse","false");
    }
    sound.addEventListener("click",soundOff);
    help.addEventListener("click",showHelp);
    close.addEventListener("click",closeHelp);
}