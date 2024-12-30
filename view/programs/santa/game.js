(function(){
    var msgTransmit = {
        name: null,
        score: 0,
        tel: 0,
        game: 1,
        flag: false
    };
    var GAME={};
    GAME.score = 0;
    if(localStorage.getItem("name")){
        GAME.name = localStorage.getItem("name");
    }else{
        GAME.name = "";
    }
    
    var form = document.forms[0];
    var dom = {
        popup: getBId("popup"),
        submitName: getBId("submitName"),
        submitTel: getBId("submitTel"),
        playerName: form.elements["playerName"],
        userName: getBId("userName"),
        lis: document.querySelectorAll("ul li"),
        myScore: getBId("myScore"),
        myRank: getBId("myRank"),
        playerTel: form.elements["playerTel"],
        firstGame: getBId("firstGame"),
        contact: getBId("contact"),
        share: getBId("share")
    }
    //dom.share.addEventListener("click", shareClick, false);
    
    function sendMsg() {
        var result
        ,endArg = {
            arg1: 0,
            arg2: 1,
            arg3: 2
        };
        function dealPopupT(e) {
            e.preventDefault();
            msgTransmit.tel = dom.playerTel.value;
            dom.popup.addClass("hide");
            dom.contact.addClass("hide");
            dom.submitTel.removeEventListener("click", dealPopupT, false);
            msgTransmit.flag = true;

        }
        function inputTel() {
            dom.firstGame.addClass('hide');
            dom.popup.removeClass('hide');
            dom.contact.removeClass('hide');
            dom.submitTel.addEventListener("click", dealPopupT, false);
        }
        function firstContact() {
            var list = dom.lis
                ,i
                ,len
                ,index
                ,index2
                ,rankrec;
            for( i = 0, len = list.length; i < len; i++ ) {
                if( i == 6 ) continue;
                if( i < 6 ) {
                    index2 = i;
                }else {
                    index2 = i-1;
                }
                index = -1;
                while( list[i].children[++index].nodeType != 1 );
                list[i].children[index].innerHTML = result.list[index2].rank;
                while( list[i].children[++index].nodeType != 1 );
                list[i].children[index].innerHTML = result.list[index2].name;
                while( list[i].children[++index].nodeType != 1 );
                list[i].children[index].innerHTML = result.list[index2].score;
            }
            result.is6 <= 6 && inputTel();
            dom.myScore.innerHTML = GAME.score;
            dom.myRank.innerHTML = result.is6;
        }
        function secondContact() {
            alert("提交成功~~等待好消息吧~~");
        }
        function endReq() {
            var rar = ""
                ,i
                ,uid
                ,abs
                ,password = ""
                ,t
                ,efs;
            for( i = 0, uid = 4; i < uid; i++ ) {
                password = password + i; 
            }
            t = password;
            password = "";
            rar += "{\"" + result.keys[0].substring(result.index[0], result.index[0] + 8)+"\":\"";
            efs = rar;
            rar = null;
            password = efs;
            rar = password  + result.keys[1].substring(result.index[1], result.index[1]+13) + "\",\"" + 
                                result.keys[2].substring(result.index[2], result.index[2] + 8)+"\":\"" + result.keys[3].substring(result.index[3], result.index[3]+13) + 
                    "\",\"" + "score\":" + GAME.score + ",\"name\":\"" + GAME.name + "\",\"tel\":0" + ",\"game\":1" +
                            "}";
        }
        function contact(flag, callback, url, arg) {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if(xhr.readyState == 4 ) {
                    if( xhr.status >= 200 && xhr.status < 300 || xhr.status == 304 ) {
                        if( url.indexOf("begin") == -1 ) {
                            result = JSON.parse(xhr.responseText);
                        }
                        if(callback) {
                            callback();
                        }
                    }else {
                        if( confirm("网络请求失败，是否重试？") ) {
                            arguments.callee(flag, callback, url, arg);
                        }
                    }
                }
            }
            xhr.open("post", url, false);
            xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
            xhr.send(arg);
        }
        
    }
            
    
    Element.prototype.removeClass = function( value ) {
        var classes, elem, cur, clazz, j,
            i = 0,
            len = this.length,
            proceed = arguments.length === 0 || typeof value === "string" && value;
    
        if ( proceed ) {
            classes = ( value || "" ).match( /\S+/g ) || [];
            elem = this;
            cur = elem.nodeType === 1 && ( elem.className ?
                ( " " + elem.className + " " ).replace( /[\t\r\n\f]/g, " " ) :
                ""
            );
    
            if ( cur ) {
                j = 0;
                while ( (clazz = classes[j++]) ) {
                    while ( cur.indexOf( " " + clazz + " " ) >= 0 ) {
                        cur = cur.replace( " " + clazz + " ", " " );
                    }
                }
                elem.className = value ? cur : "";
            }
        }
    }
    Element.prototype.addClass = function( value ) {
        var classes, elem, cur, clazz, j,
            i = 0,
            len = this.length,
            proceed = typeof value === "string" && value;
        if ( proceed ) {
            classes = ( value || "" ).match( /\S+/g ) || [];
            elem = this;
            cur = elem.nodeType === 1 && ( elem.className ?
                ( " " + elem.className + " " ).replace( /[\t\r\n\f]/g, " " ) :
                " "
            );
            if ( cur ) {
                j = 0;
                while ( (clazz = classes[j++]) ) {
                    if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
                        cur += clazz + " ";
                    }
                }
                elem.className = cur ;
            }
        }
    }
    
    function getBId(id) {
        return document.querySelector("#" + id) || document.getElementById(id);
    }
    
    window.addEventListener('load', eventWindowLoaded, false);
    function eventWindowLoaded() {
        canvasApp();
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
        //ConsoleLog.log(returnExtension);
        return returnExtension;   
    }
    
    function canvasApp(){
        var theCanvas = document.getElementById("gameCanvas");
        if (!theCanvas || !theCanvas.getContext) {
            return;
        }
        var context = theCanvas.getContext("2d");
        if (!context) {
            return;
        }
        //canvas dimensions
        var canvasWidth = theCanvas.width;
        var canvasHeight = theCanvas.height;
        //**** application loop
        //frameRateCounter = new FrameRateCounter();
        const FRAME_RATE=33;
        var intervalTime=1000/FRAME_RATE;
        //UI HTML elements
        var ui = document.getElementById("gameUI");
        var uiReady = document.getElementById("gameReady");
        var uiStats = document.getElementById("gameStats");
        var uiComplete = document.getElementById("gameComplete");
        var uiPlay = document.getElementById("gamePlay");
        var uiAgain = document.getElementById("gameAgain");
        var uiScore = document.getElementById("gameScore");
        var uiUScore = document.getElementById("myScore");
        var uiMute = document.getElementById("mute");
        var uiPopup = document.getElementById("popup");
        var uiFirstgame = document.getElementById("firstGame");
        //Game preload tiles
        var url = "./"
        var treeTiles;
        var santaTiles;
        var giftTiles;
        var deerTiles;
        var santaPre;
        var bandPre;
        var musicPre;
        var popupPre;
        //sounds
        //var MAX_SOUNDS = 5;
        var soundPool = new Array();
        var backgroundSound;
        var collideSound1;
        var collideSound2;
        var audioType;
        var loadCount;
        var itemsToLoad = 10;
        //const Variable
        var TREE_INIT_TOP = 600;
        var SANTA_JUMP_TOP = 100;
        var SANTA_STATE_STEADY=0;
        var SANTA_STATE_JUMP=1;
        var deerWidth=230;
        var deerHeight=127;
        var giftWidth = 76;
        var giftHeight = 72;
        var giftXdistance = 100;
        var giftLdistance = 112;
        var giftOffset = 612;
        var giftNum = 7;
        var giftRowNum = 6;
        var santaWidth = 90;
        var santaHeight = 122;
        var collisionRange = 40;
        var gravity = 2;
        var initSpeedX = 12;
        var elasSpeedY = -32;
        var cursorX;
        var scale;
        //application states
        var GAME_STATE_INIT=0;
        var GAME_STATE_WAIT_FOR_LOAD=1;
        var GAME_STATE_TITLE=2;
        var GAME_STATE_NEW_GAME=3;
        var GAME_STATE_PLAYER_START=4;
        var GAME_STATE_GAME_OVER=5;
        //application variable
        var firstJump;
        var stateChange = false;
        var currentGameState=0;
        var currentGameStateFunction=null;
        //create game objects and arrays
        var santa;
        var tree;
        var gifts;
        var snow=[];
        var deer;
        //var snowPool=[];
        var snowNum=50;
        var t; //timeout
    
        function switchGameState(newState) {
            currentGameState=newState;
            switch (currentGameState) {
                case GAME_STATE_INIT:
                    currentGameStateFunction=gameStateInit;
                    break;
                case GAME_STATE_WAIT_FOR_LOAD:
                    currentGameStateFunction=gameStateWaitForLoad;
                    break;
                case GAME_STATE_TITLE:
                    currentGameStateFunction=gameStateTitle;
                    break;
                case GAME_STATE_NEW_GAME:
                    currentGameStateFunction=gameStateNewGame;
                    break;
                case GAME_STATE_PLAYER_START:
                    currentGameStateFunction=gameStatePlayerStart;
                    break;
                case GAME_STATE_GAME_OVER:
                    currentGameStateFunction=gameStateGameOver;
                    break;
            }
            stateChange = true;
        }
        function gameStateInit() {
            loadCount=0;
            
            backgroundSound = document.createElement("audio");
            audioType = supportedAudioFormat(backgroundSound);
            document.body.appendChild(backgroundSound);
            //audioType = supportedAudioFormat(collideSound);
            backgroundSound.setAttribute("src", url + "love_snow." + audioType);
            backgroundSound.setAttribute("autoplay", "true");
            backgroundSound.setAttribute("loop", "true");
            
            collideSound1 = document.createElement("audio");
            document.body.appendChild(collideSound1);
            collideSound1.setAttribute("src", url + "collide." + audioType);
            collideSound1.addEventListener("canplaythrough",itemLoaded,false);
            /*collideSound1.addEventListener("error", cannotload ,false);*/
            soundPool.push({name:"collide", element:collideSound1, played:false});
            collideSound2 = document.createElement("audio");
            document.body.appendChild(collideSound2);
            collideSound2.setAttribute("src", url + "collide." + audioType);
            collideSound2.addEventListener("canplaythrough",itemLoaded,false);
            soundPool.push({name:"collide", element:collideSound2, played:false});
            
            treeTiles = new Image();
            treeTiles.onload = itemLoaded;
            treeTiles.src = url + "image/tree.png";
            santaTiles = new Image();
            santaTiles.onload = itemLoaded;
            santaTiles.src = url + "image/santa.png";
            giftTiles = new Image();
            giftTiles.onload = itemLoaded; 
            giftTiles.src = url + "image/gifts.png";
            deerTiles = new Image();
            deerTiles.onload = itemLoaded;
            deerTiles.src = url + "image/deer.png";
            santaPre = new Image();
            santaPre.onload = itemLoaded;
            santaPre.src = url + "image/santa3.png";
            bandPre = new Image();
            bandPre.onload = itemLoaded;
            bandPre.src = url + "image/gameover_bg.png";
            musicPre = new Image();
            musicPre.onload = itemLoaded;
            musicPre.src = url + "image/music.png";
            popupPre = new Image();
            popupPre.onload = itemLoaded;
            popupPre.src = url + "image/popup.png";
            switchGameState(GAME_STATE_WAIT_FOR_LOAD);
        }
    
        /*function cannotload(){
            alert("请更新您的浏览器至新版本的IE、Chrome、Firefox等");
        }*/
    
        function itemLoaded(event) {
            loadCount++;
            //ConsoleLog.log("loading:" + loadCount)
            if (loadCount >= itemsToLoad) {
                collideSound1.removeEventListener("canplaythrough",itemLoaded, false);
                collideSound2.removeEventListener("canplaythrough",itemLoaded, false);
                backgroundSound.removeEventListener("canplaythrough",itemLoaded, false);
                switchGameState(GAME_STATE_TITLE);            
            }
        }
    
        function gameStateWaitForLoad(){
            context.fillStyle= "#fff";
            context.font = "bold 48px Verdana";
            context.textAlign = "center";
            context.textBaseline = "medium";
            context.fillText("Loading...", 0.5*canvasWidth ,0.5*canvasHeight);
        }
    
        function gameStateTitle() {
            //ConsoleLog.log("appStateTitle");
            context.clearRect(0, 0, canvasWidth, canvasHeight);
            uiReady.style.removeProperty("display");
        }
    
        dom.submitName.addEventListener("click",setName,false);
        function setName(e){
            e.preventDefault();
            e.stopPropagation();
            var name = dom.playerName.value;
            if(name != ""){
                localStorage.setItem("name",name);
                //dom.userName.innerHTML = name;
                //dom.playerName.value = "";
            }else{
                localStorage.setItem("name","游客");
            }
            GAME.name = localStorage.getItem("name");
            dom.popup.className="hide";
            dom.firstGame.className="hide";
            ui.addEventListener("click", jump, false);
        }
    
        function gameStateNewGame() {
            uiMute.style.removeProperty("display");
            uiReady.style.display="none";
            uiComplete.style.display="none";
            if(!localStorage.getItem("name") || localStorage.getItem("name")=="游客"){
                uiPopup.setAttribute('class','');
                uiFirstgame.setAttribute('class','');
            }else{
                ui.addEventListener("click", jump, false);
            }
            //ui.addEventListener("click", jump, false);
            scale = 1;
            clearTimeout(t);
            firstJump = false;
            initTree();
            initGifts();
            initSanta();
            initSnow(snowNum);
            initDeer();
            uiScore.innerHTML= santa.score;
            uiStats.style.removeProperty("display");
            var giftTmp;
            var render = function(){
                context.clearRect(0, 0, canvasWidth, canvasHeight);
                context.drawImage(treeTiles, 0, tree.ypos, 800, 600, 0, 0,800,600);
                for(var i=0;i<giftNum;i++){
                    giftTmp = gifts[i];
                    context.drawImage(giftTiles, giftTmp.sourceX, 0, giftWidth, giftHeight, giftTmp.xpos, giftTmp.ypos,giftWidth, giftHeight);
                }
                updateSanta();
                context.drawImage(santaTiles, santaWidth*0, 0, santaWidth, santaHeight, santa.xpos, santa.ypos, santaWidth, santaHeight);
                //context.drawImage(santaTiles, santa.xpos, santa.ypos);
                updateSnow();
                renderSnow();
                checkCollision();
                if(firstJump){
                    ui.removeEventListener("click", jump, false);
                    t = setTimeout(function(){
                        scale -= 0.1;
                        //ConsoleLog.log(scale);
                        if(scale > 0.7){
                            t = setTimeout(arguments.callee,20000);
                        }
                    }, 20000);
                    switchGameState(GAME_STATE_PLAYER_START);
                    return;
                }
                setTimeout(arguments.callee,intervalTime);
            }();
        }
        function gameStatePlayerStart(){
            //ConsoleLog.log("appStatePlayerStart");
            updateSanta();
            updateGifts();
            updateTree();
            updateSnow();
            context.clearRect(0, 0, canvasWidth, canvasHeight);
            renderTree();
            renderGifts();
            if(deer.emerge){
                renderDeer();
            }
            renderSanta();
            renderSnow();
            checkCollision();
            uiScore.innerHTML= santa.score;
            if(santa.ypos+santaHeight >= theCanvas.height){
                switchGameState(GAME_STATE_GAME_OVER);
                return;
            }
            /*if(santa.score >= 400){
                scale = 0.7;
            }*/
            setTimeout(arguments.callee,intervalTime);
        }
    
        function gameStateGameOver() {
            //ConsoleLog.log("appStateGameOver");
            context.clearRect(0, 0, canvasWidth, canvasHeight);
            updateSnow();
            tree.ypos -= elasSpeedY;
            if(tree.ypos<TREE_INIT_TOP){
                context.drawImage(treeTiles, 0, tree.ypos, 800, 600, 0, 0,800,600);
                renderSanta();
                renderSnow();
                setTimeout(arguments.callee,intervalTime);
            }else{
                context.drawImage(treeTiles, 0, TREE_INIT_TOP, 800, 600, 0, 0,800,600);
                renderSanta();
                uiUScore.innerHTML= santa.score;
                GAME.score=santa.score;
                uiStats.style.display="none";
                uiMute.style.display="none";
                uiComplete.style.removeProperty("display");
                sendMsg();
            }
        }
    
        function initSanta(){
            santa = {
                speedY: 0,
                speedX: initSpeedX,
                xpos: 0.5*canvasWidth-27,
                ypos: canvasHeight-93,
                score: 0,
                state: SANTA_STATE_STEADY
            };
        }
        var jump = function(){
            santa.speedY = elasSpeedY;
            /*dom.popup.className="hide";
            dom.firstGame.className="hide";
            setName();*/
        }
        function updateSanta(){
            var centerX = santa.xpos + 0.5*santaWidth;
            var centerY = santa.ypos + 0.5*santaHeight;
            if(centerX < cursorX-santa.speedX)
                santa.xpos += santa.speedX;
            else if(centerX > cursorX+santa.speedX)
                santa.xpos -= santa.speedX;
            else
                santa.xpos = cursorX-0.5*santaWidth;
            if(santa.speedY >= 0 || santa.ypos >= SANTA_JUMP_TOP){
                santa.ypos += santa.speedY;
            }
            santa.speedY += gravity;
            if(santa.ypos+santaHeight >= canvasHeight){
                santa.ypos = canvasHeight-santaHeight;
                santa.speedY = 0;
            }
            if(santa.speedY < 2)
                santa.state=SANTA_STATE_JUMP;
            else
                santa.state=SANTA_STATE_STEADY;
        }
    
        function renderSanta(){
            context.drawImage(santaTiles, santaWidth*santa.state, 0, santaWidth, santaHeight, santa.xpos, santa.ypos, santaWidth, santaHeight);
        }
    
        function initGifts(){
            gifts=[];
            for(var i=0; i<giftNum; i++){
                var newGift={};
                //newGift.alpha=1;
                newGift.sourceX=Math.floor(Math.random()*5) * giftWidth;
                newGift.xpos=Math.floor(Math.random()*giftRowNum) * giftXdistance + giftLdistance;
                if( i>0 && newGift.xpos == gifts[i-1].xpos){
                    newGift.xpos = newGift.xpos + giftXdistance;
                    if(newGift.xpos > giftOffset)
                        newGift.xpos = giftLdistance;
                }
                newGift.ypos=400-i*100;
                newGift.collision=false;
                gifts.push(newGift);
            }
        }
        function renderGifts(){
            var giftTmp;
            //context.globalAlpha = 1;
            for(var i=0;i<giftNum;i++){
                giftTmp = gifts[i];
                //context.save(); //save current state in stack
                //context.globalAlpha = giftTmp.alpha;
                context.drawImage(giftTiles, giftTmp.sourceX, 0, giftWidth, giftHeight, giftTmp.xpos, giftTmp.ypos, scale*giftWidth, scale*giftHeight);
                //context.restore();
            }
        }
    
        function updateGifts(){
            var giftTmp;
            for(var i=0;i<giftNum;i++){
                giftTmp = gifts[i];
                if(giftTmp.ypos >= canvasHeight){
                    gifts.splice(i,1);
                    var newGift={};
                    //newGift.alpha=1;
                    newGift.sourceX=Math.floor(Math.random()*5) * giftWidth;
                    newGift.xpos=Math.floor(Math.random()*giftRowNum) * giftXdistance + giftLdistance;
                    if(newGift.xpos == gifts[giftNum-2].xpos){
                        newGift.xpos = newGift.xpos + giftXdistance;
                        if(newGift.xpos > giftOffset)
                            newGift.xpos = giftLdistance;
                    }
                    newGift.ypos=gifts[giftNum-2].ypos-100;
                    newGift.collision=false;
                    gifts.push(newGift);
                    i--;
                    continue;
                }
                //if(giftTmp.alpha>0 && giftTmp.collision == true){
                if(giftTmp.collision == true){
                    giftTmp.ypos += 5;
                    //giftTmp.alpha -= 0.0625;
                }
                if(santa.ypos < SANTA_JUMP_TOP && santa.speedY < 0){
                    giftTmp.ypos -= santa.speedY;
                }
            }
        }
    
        function initTree(){
            tree={};
            tree.ypos=TREE_INIT_TOP;
        }
    
        function updateTree(){
            if(santa.ypos < SANTA_JUMP_TOP && santa.speedY < 0){
                tree.ypos += santa.speedY;
            }
            if(tree.ypos <= 0){
                tree.ypos += 235;
            }else if(tree.ypos > TREE_INIT_TOP){
                tree.ypos=TREE_INIT_TOP;
            }
        }
    
        function renderTree(){
            context.drawImage(treeTiles, 0, tree.ypos, 800, 600, 0, 0,800,600);
        }
    
        function initSnow(num){
            snow=[];
            for(var snowCtr=0; snowCtr<num; snowCtr++){
                var newSnow={};
                newSnow.x=Math.random()*canvasWidth;
                newSnow.y=Math.random()*canvasHeight;
                newSnow.dx=Math.random()*1;
                if(Math.random()<0.5){
                    newSnow.dx*=-1;
                }
                newSnow.dy=Math.random()*3;
                newSnow.radius=Math.random()+2;
                newSnow.dy=5-newSnow.radius;
                newSnow.floatNum=0;
                snow.push(newSnow);
            }
        }
        function updateSnow(){
            var tempSnow;
            for(var snowCtr=0; snowCtr<snow.length; snowCtr++){
                tempSnow = snow[snowCtr];
                if(tempSnow.y >= canvasHeight){
                    tempSnow.y=0;
                }
                tempSnow.x += tempSnow.dx;
                if(tempSnow.floatNum>=60){
                    tempSnow.dx*=-1;
                    tempSnow.floatNum=0;
                }else{
                    tempSnow.floatNum++;
                }
                tempSnow.y += tempSnow.dy;
                if(santa.ypos < SANTA_JUMP_TOP && santa.speedY < 0){
                    tempSnow.y -= santa.speedY;
                }
            }
        }
        function renderSnow(){
            var snowLength = snow.length;
            //ConsoleLog.log(snowLength);
            var tempSnow;
            for(var snowCtr=0; snowCtr<snowLength; snowCtr++){
                tempSnow = snow[snowCtr];
                context.beginPath();
                context.arc(tempSnow.x,tempSnow.y,tempSnow.radius,0,Math.PI*2,false);
                context.closePath();
                context.fillStyle="rgba(255,255,255,1)";
                context.fill();
            }
        }
    
        function initDeer(){
            deer={};
            deer.ypos = -800;
            deer.xpos = canvasWidth;
            deer.speedX = -3;
            deer.state = 0;
            deer.emerge = false;  
            deer.counter=0; 
            deer.collision=false;
            setTimeout(function(){
                deer.emerge = true;
                //ConsoleLog.log("change");
            },30000);
        }
        function renderDeer(){
            deer.xpos+=deer.speedX;
            if(santa.ypos < SANTA_JUMP_TOP && santa.speedY < 0){
                deer.ypos -= santa.speedY;
            }
            if(deer.counter>10){
                deer.counter = 0
                deer.state = !deer.state;
            }else{
                deer.counter++;
            }
            if(deer.xpos<-deerWidth || deer.collision==true){
                deer.emerge = false;
                deer.collision=false;
                deer.xpos=canvasWidth;;
                deer.ypos=-800;
                setTimeout(function(){
                    deer.emerge = true;
                    //ConsoleLog.log("change");
                },30000);
            }else{
                context.drawImage(deerTiles, deer.state*deerWidth, 0, deerWidth, deerHeight, deer.xpos, deer.ypos,deerWidth, deerHeight);
            }
        }
    
        function checkCollision(){
            var giftTmp;
            var Sx,Sy,Gx,Gy,distance,dx,dy;
            Sx=santa.xpos+.5*santaWidth;
            Sy=santa.ypos+santaHeight;
            if(deer.emerge){
                Dx=deer.xpos+0.5*deerWidth;
                Dy=deer.ypos+0.5*deerHeight;
                dx=Sx-Dx;dy=Sy-Dy;
                distance=Math.sqrt(dx*dx + dy*dy);
                if(distance<collisionRange && Sy<Dy && santa.speedY >= 0){
                    santa.speedY = elasSpeedY;
                    santa.score *= 2;
                    deer.collision=true;
                    playSound("collide",0.2);
                } 
            }
            for(var i=0 ;i<giftNum;i++){
                if(gifts[i].collision)
                    continue;
                giftTmp = gifts[i];
                Gx=giftTmp.xpos+.5*giftWidth*scale;
                Gy=giftTmp.ypos+.5*giftHeight*scale;
                dx=Sx-Gx;dy=Sy-Gy;
                distance=Math.sqrt(dx*dx + dy*dy);
                if(distance<scale*collisionRange && Sy<Gy && santa.speedY > 0){
                    firstJump=true;
                    santa.speedY = elasSpeedY;
                    giftTmp.collision = true;
                    santa.score += 10;
                    playSound("collide",0.2);
                    return;
                }  
            }
        }
    
        function playSound(sound,volume) {
            var soundFound = false;
            var soundIndex = 0;
            var tempSound;
            if (soundPool.length> 0) {
                while (!soundFound && soundIndex < soundPool.length) {
                    var tSound = soundPool[soundIndex];
                    if ((tSound.element.ended || !tSound.played) && tSound.name == sound) {
                        soundFound = true;
                        tSound.played = true;
                    } else {
                        soundIndex++;
                    }
            
                }
            }
            if (soundFound) {
                tempSound = soundPool[soundIndex].element;
                tempSound.loop = false;
                tempSound.volume = volume;
                tempSound.play();   
            } /*else if (soundPool.length < MAX_SOUNDS){
                ConsoleLog.log("sound not found");
                tempSound = document.createElement("audio");
                tempSound.setAttribute("src", sound + "." + audioType);
                tempSound.volume = volume;
                tempSound.play();
                soundPool.push({name:sound, element:tempSound, played:true});
            }  */     
        }
    
        ui.onmousemove = function(e){
            cursorX = e.pageX - theCanvas.offsetLeft;
        };
        uiPlay.onclick = function(e){
            e.preventDefault();
            e.stopPropagation();
            switchGameState(GAME_STATE_NEW_GAME);
        };
        uiAgain.onclick = function(e){
            e.preventDefault();
            switchGameState(GAME_STATE_NEW_GAME);
            e.stopPropagation();
        };
        uiMute.onclick = function(e){
            //e.preventDefault();
            if(backgroundSound.muted){
                backgroundSound.muted=false;
                collideSound1.muted=false;
                collideSound2.muted=false;
                uiMute.style.setProperty("background-position", "0");
            }else{
                backgroundSound.muted=true;
                collideSound1.muted=true;
                collideSound2.muted=true;
                uiMute.style.setProperty("background-position", "60px");
            }
            //collideSound.muted = true;
            e.stopPropagation();
        };
    
        //*** application start
        switchGameState(GAME_STATE_INIT);
        currentGameStateFunction();
    
        setInterval(function(){
            if(stateChange == true){
                currentGameStateFunction();
                stateChange = false;
            }
        },intervalTime);
    }
    
    //*** FrameRateCounter  object prototype
    /*function FrameRateCounter() {
        this.lastFrameCount=0;
        var dateTemp =new Date();
        this.frameLast=dateTemp.getTime();
        delete dateTemp;
        this.frameCtr=0;
    }
    FrameRateCounter.prototype.countFrames=function() {
        var dateTemp =new Date();   
        this.frameCtr++;
        if (dateTemp.getTime() >=this.frameLast+1000) {
            ConsoleLog.log("frame event");
            this.lastFrameCount=this.frameCtr;
            this.frameLast=dateTemp.getTime();
            this.frameCtr=0;
        }    
        delete dateTemp;
    }*/
    
    //*** consoleLog util object
    function ConsoleLog(){
    }
    ConsoleLog.log=function(message) {
        if(typeof(console) !== 'undefined' && console != null) {
            console.log(message);
        }
    };
    //*** end console log object
    })();