window.onload=function(){
	var container = selectorUtil("#container");

	var fire= selectorUtil("#fire");
	fire.die=false;
	var seed = selectorUtil("#seed");
    seed.wid=70;
    seed.hei=34;
    seed.still=false;
    seed.xPos=0;
    seed.yPos=0;
	var seed_item=selectorUtil("#seed_item");
	var pipe = selectorUtil("#pipe");
	pipe.open=false;
	var water = selectorUtil("#water");
	var dog = selectorUtil("#dog");
	var hat = selectorUtil("#hat");
    hat.geted=false;
	var robot_head = selectorUtil("#robot_head");
	var bucket = selectorUtil("#bucket");
	bucket.full=false;
    bucket.still=false;
    bucket.wid=115;
    bucket.hei=134;
    var bucket_hold = selectorUtil("#bucket_hold");
    bucket_hold.react=false;
    var fire_hold = selectorUtil("#fire_hold");
    fire_hold.react=false;
	var bucket_item=selectorUtil("#bucket_item");;
	var flower_pot = selectorUtil("#flower_pot");
	var flower_pot_item=selectorUtil("#flower_pot_item");
	flower_pot_item.seed=false;
	var water_item=selectorUtil("#water_item");
    var torch = selectorUtil("#torch");
    torch.wid=73;
    torch.hei=122;
    var torch_item = selectorUtil("#torch_item");
    var leaf = selectorUtil("#leaf");
    var flower = selectorUtil("#flower");
    var pot_container = selectorUtil("#pot_container");
    var tools = selectorUtil("#tools");
	var bubble = selectorUtil("#bubble");
	var people = selectorUtil("#people");
	var start = selectorUtil("#start");
	var remind_container = selectorUtil("#remind_container");
	var white = selectorUtil("#white_light");
    var pot_show = selectorUtil("#pot_show");
    var white = selectorUtil(".white");
    var white_light = selectorUtil("#white_light");

    var audioType;
    var storage = getLocalStorage();

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
    img1.src="image/scene1.png";
    img1.addEventListener("load",itemLoaded);
    var img2 = document.createElement("img");
    img2.src="image/pass_light.png";
    img2.addEventListener("load",itemLoaded);

    var water_sound = document.createElement("audio");
    //music1.addEventListener("canplaythrough",itemLoaded);
    audioType = supportedAudioFormat(water_sound);
    //document.body.appendChild(water_sound);
    water_sound.setAttribute("src","music/water." + audioType);
    water_sound.setAttribute("loop", "true");

    function ani_fire(){
		var id1=setInterval(function(){
			fire.style.backgroundPosition="left";
			if(fire.die){
				clearInterval(id1);
			}
		}, 1000);
		setTimeout(function(){
			var id2=setInterval(function(){
				fire.style.backgroundPosition="right";;
				if(fire.die){
					clearInterval(id2);
				}
			},1000);
		},500);
	}

	function ani_water(){
		water.style.backgroundPosition = "top";
		var id1=setInterval(function(){
			water.style.backgroundPosition = "top";
			if(!pipe.open){
				clearInterval(id1);
			}
		},1200);
		setTimeout(function(){
			water.style.backgroundPosition = "center";
			var id2 = setInterval(function(){
				water.style.backgroundPosition = "center";
				if(!pipe.open){
					clearInterval(id2);
				}
			},1200);
		},400);
		setTimeout(function(){
			water.style.backgroundPosition = "bottom";
			var id3 = setInterval(function(){
				water.style.backgroundPosition = "bottom";
				if(!pipe.open){
					clearInterval(id3);
				}
			},1200);
		},800);
	}
	function ani_robot_open(){
		robot_head.style.backgroundPosition="right";
		robot_head.removeEventListener("click",ani_robot_open);
        robot_head.style.cursor="default";
        flower_pot.style.zIndex="3";
		flower_pot.addEventListener("click",get_pot);
	}

	function remind(item){
        removeClass(remind_container,"hide");
		var p = remind_container.getElementsByTagName("p").item(0);
		var pic = selectorUtil("#pic");
        pic.style.backgroundPosition="left";
		switch(item){
			case "bucket":
				p.innerHTML="你得到一个水桶~";
				pic.style.backgroundImage="url(image/bucket.png)";
				pic.className="tada";
				setTimeout(function(){
					pic.className="";
				},700);
			break;
			case "flower_pot":
				p.innerHTML="你得到一个花盆~";
                pic.style.backgroundImage="url(image/flower_pot.png)";
                pic.className="tada";
				setTimeout(function(){
					pic.className="";
				},700);
			break;
            case "torch":
                p.innerHTML="你得到一个手电筒~";
                pic.style.backgroundImage="url(image/torch.png)";
                pic.className="tada";
                setTimeout(function(){
                    pic.className="";
                },700);
            break;
            case "water":
                p.innerHTML="水桶里注满了水~";
                pic.style.backgroundImage="url(image/bucket.png)";
                pic.style.backgroundPosition="right";
                pic.className="tada";
                setTimeout(function(){
                    pic.className="";
                },700);
            break;
            case "empty":
                p.innerHTML="水桶里的水已用完~";
                pic.style.backgroundImage="url(image/bucket.png)";
                pic.style.backgroundPosition="left";
                pic.className="tada";
                setTimeout(function(){
                    pic.className="";
                },700);
            break;
			case "seed":
				p.innerHTML="你得到一颗种子~";
                pic.style.backgroundImage="url(image/seed.png)";
                pic.className="tada";
                setTimeout(function(){
                    pic.className="";
                },700);
			break;
		}
        setTimeout(function(){
            addClass(remind_container,"hide");
            addClass(tools,"tool_slide");
            setTimeout(function(){
                removeClass(tools,"tool_slide");
            },2000);
        },1400);
	}

	function get_bucket(event){
		hat.className="hide";
		remind("bucket");
		bucket_item.className="item";
		bucket_item.addEventListener("click",bucket_use);
	}
    function get_torch(event){
        torch.className="hide";
        remind("torch");
        torch_item.className="item";
        container.appendChild(torch);
        torch.style.zIndex = "99";
        torch_item.addEventListener("click",torch_use);
        torch.removeEventListener("click",get_torch);
    }
    function get_pot(event){
        flower_pot.className="hide";
        event.stopPropagation();
        flower_pot_item.className="item";
        flower_pot_item.addEventListener("click",show_pot);
        remind("flower_pot");
    }
    function get_seed(){
        seed_item.className="item";
        seed.className="hide";
        seed_item.addEventListener("click",seed_use);
        remind("seed");
        seed.removeEventListener("click",get_seed);
    }

	function bucket_use(event){
        if(!hasClass(pot_show,"hide")){
            addClass(pot_show,"hide");
        }
        bucket.style.left=event.pageX-container.offsetLeft-.5*bucket.wid + "px";
        bucket.style.top=event.pageY-.5*bucket.hei + "px";
		bucket.className="";
        window.addEventListener("mousemove",bucket_move);
        bucket.still= false;
        bucket.style.opacity="0.5";
        bucket.style.zIndex="11";
	}
    function bucket_move(event){
         bucket.style.left=event.pageX-container.offsetLeft-.5*bucket.wid + "px";
         bucket.style.top=event.pageY-.5*bucket.hei + "px";
         window.addEventListener("click",bucket_still);
        if(bucket_hold.react || fire_hold.react){
            bucket.style.opacity="1";
        }else{
            bucket.style.opacity="0.5";
        }
    }
    function bucket_still(event){
        bucket.style.zIndex="";
        window.removeEventListener("click",bucket_still);
        window.removeEventListener("mousemove", bucket_move);
        if(bucket_hold.react || fire_hold.react) {
            bucket.still=true;
            bucket.style.left="470px";
            bucket.style.top="360px";
        }else{
            addClass(bucket,"hide");
        }
    }

    var react_item = "";
    function seed_use(event){
        seed.style.backgroundPosition="left";
        seed.style.opacity="0.5";
        seed.style.zIndex="99";
        seed.style.left=event.pageX-container.offsetLeft-.5*seed.wid + "px";
        seed.style.top=event.pageY-.5*seed.hei + "px";
        seed.className="";
        window.addEventListener("mousemove",seed_move);
    }
    function seed_move(event){
        seed.still=false;
        seed.xPos=event.pageX-container.offsetLeft;
        seed.yPos=event.pageY;
        seed.style.left=seed.xPos -.5*seed.wid + "px";
        seed.style.top=seed.yPos -.5*seed.hei + "px";
        if(!hasClass(pot_show,"hide") && seed.xPos>580 && seed.xPos<700 && seed.yPos>290 && seed.yPos<470){
            seed.style.opacity="1";
            react_item="seed";
        }else{
            seed.style.opacity="0.5";
            react_item="";
        }
        window.addEventListener("click",seed_still);
    }
    function seed_still(){
        window.removeEventListener("click",seed_still);
        window.removeEventListener("mousemove",seed_move);
        if(react_item == "seed"){
            var p = pot_show.getElementsByTagName("p").item(0);
            p.innerHTML="种子在等待发芽~";
            seed.className="hide";
            seed_item.className="hide";
            seed.still=true;
        }else{
            seed.className="hide";
        }
    }
    function water_use(event){
        bucket.style.opacity="0.5";
        bucket.style.zIndex="99";
        bucket.style.left=event.pageX-container.offsetLeft-.5*bucket.wid + "px";
        bucket.style.top=event.pageY-.5*bucket.hei + "px";
        bucket.className="";
        window.addEventListener("mousemove",water_move);
    }
    function water_move(event){
        bucket.still=false;
        bucket.xPos=event.pageX-container.offsetLeft;
        bucket.yPos=event.pageY;
        bucket.style.left=bucket.xPos - .5*bucket.wid + "px";
        bucket.style.top=bucket.yPos -.5*bucket.hei + "px";
        if(react_item=="seed" || react_item=="water"){
            if(!hasClass(pot_show,"hide") && bucket.xPos>580 && bucket.xPos<700 && bucket.yPos>290 && bucket.yPos<470){
                bucket.style.opacity="1";
                react_item="water";
            }else{
                bucket.style.opacity="0.5";
                react_item="seed";
            }
        }
        window.addEventListener("click",water_still);
    }
    function water_still(){
        window.removeEventListener("click",water_still);
        window.removeEventListener("mousemove",water_move);
        if(react_item == "water"){
            bucket.still=true;
            var p = pot_show.getElementsByTagName("p").item(0);
            p.innerHTML="得到充足的水份，种子发芽了~";
            addClass(leaf,"grow");
            bucket.className="hide";
            water_item.className="hide";
        }else{
            bucket.className="hide";
        }
    }
    function torch_use(event){
        container.appendChild(torch);
        torch.style.backgroundPosition="left";
        torch.style.opacity="0.5";
        torch.style.zIndex="99";
        torch.style.left=event.pageX-container.offsetLeft-.5*torch.wid + "px";
        torch.style.top=event.pageY-.5*torch.hei + "px";
        torch.className="";
        window.addEventListener("mousemove",torch_move);
    }
    function torch_move(event){
        torch.still=false;
        torch.xPos=event.pageX-container.offsetLeft;
        torch.yPos=event.pageY;
        torch.style.left=torch.xPos - .5*torch.wid + "px";
        torch.style.top=torch.yPos -.5*torch.hei + "px";
        if(react_item=="water" || react_item=="torch"){
            if(!hasClass(pot_show,"hide") && torch.xPos>580 && torch.xPos<700 && torch.yPos>290 && torch.yPos<470){
                torch.style.opacity="1";
                react_item="torch";
            }else{
                torch.style.opacity="0.5";
                react_item="water";
            }
        }
        window.addEventListener("click",torch_still);
    }
    function torch_still(){
        window.removeEventListener("click",torch_still);
        window.removeEventListener("mousemove",torch_move);
        if(react_item == "torch"){
            var p = pot_show.getElementsByTagName("p").item(0);
            p.innerHTML="得到光照，小苗长成鲜花~";
            torch.still=true;
            torch.className="hide";
            torch_item.className="hide";
            addClass(flower,"grow");
            setTimeout(function(){
                leaf.className="hide";
            },400);
            setTimeout(passGame,2000);
        }else{
            torch.className="hide";
        }
    }

    function passGame(){
        white_light.appendChild(pot_container);
        flower.style.opacity="1";
        removeClass(flower,"grow");
        pot_container.style.top="260px";
        removeClass(white_light,"hide");
        removeClass(white,"hide");
        setTimeout(function(){
            addClass(white,"bright");
        },1000);
        setTimeout(function(){
            var storage=getLocalStorage();
            storage.setItem("level1","pass");
            location.href="select.html";
        },2700);
    }

    /*flower_pot_item.addEventListener("click",show_pot);*/
    function show_pot(){
        removeClass(pot_show,"hide");
        seed_item.addEventListener("click",seed_use);
        torch_item.addEventListener("click",torch_use);
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
	function water_open(){
		pipe_switch();
		setTimeout(function(){
			water.className="";
			ani_water();
            if(storage.muse == "false") {
                water_sound.play();
            }
		},700);
		pipe.removeEventListener("click",water_open);
		pipe.addEventListener("click",water_close);
	}
	function water_close(){
		pipe_switch();
        if(storage.muse == "false") {
            water_sound.pause();
        }
		setTimeout(function(){
			water.className="hide";
		},700);
		pipe.addEventListener("click",water_open);
		pipe.removeEventListener("click",water_close);
	}
	function pipe_switch(){
		if(pipe.open){
			pipe.className="flipOutY"
			pipe.open=false;
		}else{
			pipe.className="flipInY";
			pipe.open=true;
		}
	}

    var id1,id2;
    function water_react(event){
        bucket_hold.react=true;
        id1=setInterval(function(){
            if(bucket.still && (!bucket.full)){
                bucket_hold.react=false;
                bucket_hold.style.zIndex = "-1";
                if(water.className != "hide") {
                    bucket.still=false;
                    clearInterval(id1);
                    bucket_item.className= "hide";
                    water_item.className= "item";
                    if (!fire.die) {
                        water_item.addEventListener("click", bucket_use);
                        fire_hold.addEventListener("mouseover",fire_react);
                        fire_hold.addEventListener("mouseout",react_cancel);
                    } else {
                        water_item.removeEventListener("click", bucket_use);
                        fire_hold.removeEventListener("mouseover",fire_react);
                        fire_hold.removeEventListener("mouseout",react_cancel);
                        water_item.addEventListener("click",water_use);
                    }
                    setTimeout(function () {
                        water_bucket.className = "show";
                        bucket.full = true;
                        setTimeout(function () {
                            water_close();
                            setTimeout(function () {
                                remind("water");
                                bucket.className= "hide";
                            }, 1000);
                        }, 300);
                    }, 300);
                }
            }
        },50);
    }
    function react_cancel(){
        if(bucket_hold.react){
            bucket_hold.react=false;
            clearInterval(id1);
        }
        if(fire_hold.react){
            fire_hold.react=false;
            clearInterval(id2);
        }
    }
    function fire_react(event){
        fire_hold.react=true;
        id2=setInterval(function(){
            if(bucket.still && bucket.full && !fire.die){
                clearInterval(id2);
                fire_hold.style.zIndex="-1";
                fire.className="dieout";
                fire.die=true;
                water_bucket.className="";
                //bucket.className="hide";
                bucket.full = false;
                seed.addEventListener("click", get_seed);
                bucket_item.className="item";
                water_item.className="hide";
                setTimeout(function(){
                    bucket.className="hide";
                    remind("empty");
                    fire.className="hide";
                    bucket_hold.style.zIndex="";
                    bucket.still=false;
                    fire_hold.removeEventListener("mouseover",fire_react);
                    fire_hold.removeEventListener("mouseout",react_cancel);
                },1000);
            }
        },50);
    }

	var begin=function(){
		var i = 0;
		bubble.addEventListener("click",function(event){
			speak(event,i);
			i++;
		});
	}();
	/*localStorage.setItem("level1","pass");*/

    ani_fire();
	hat.addEventListener("click",get_bucket);
    torch.addEventListener("click",get_torch);
	pipe.addEventListener("click",water_open);
	robot_head.addEventListener("click",ani_robot_open);
    bucket_hold.addEventListener("mouseover",water_react);
    bucket_hold.addEventListener("mouseout",react_cancel);
    var close = selectorUtil("#close");
    close.addEventListener("click",function(){
        addClass(pot_show,"hide");
    })
}