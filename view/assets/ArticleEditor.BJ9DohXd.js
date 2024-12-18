import{_ as J,c as I,r,o as L,a as Q,b as i,d as e,t as b,w as d,e as C,v as _,F as X,f as Y,g as A,n as Z,h as tt,i as $,j as T,k as u,l as et,u as nt,m as ot,p as at}from"./index.CkiKZACR.js";const st={class:"publish-article"},lt={key:0,class:"loading"},rt={class:"form-group"},it={class:"form-group"},ut={class:"tags-input"},ct={class:"tags-container"},dt=["onClick"],pt={class:"tag-input-wrapper"},vt=["onKeydown"],gt={class:"form-group"},bt={class:"editor-toolbar"},ft={key:0,class:"upload-progress"},mt=["innerHTML"],yt={class:"form-group"},kt={class:"form-actions"},wt={type:"submit",class:"publish-btn"},ht={__name:"ArticleEditor",setup(Ct){const f=nt(),m=ot(),p=I(()=>!!m.params.id),x=r(!1),y=r(""),k=r(!1),D=r(null),M=r(null),w=r(!1),E=r(!1),g=r(0),a=r({title:"",tags:[],abbr:"",content:""}),P=()=>{M.value.click()},U=async n=>{if(!n||!n.type.startsWith("image/")){alert("请选择图片文件");return}E.value=!0,g.value=0;try{const t=new FormData;t.append("file",n),t.append("folder","article");const s=(await T.post("/upload",t,{headers:{"Content-Type":"multipart/form-data"},onUploadProgress:l=>{g.value=Math.round(l.loaded*100/l.total)}})).data.url;F(s)}catch(t){console.error("上传失败:",t),alert("图片上传失败")}finally{E.value=!1,g.value=0}},F=n=>{const t=D.value,o=t.selectionStart,s=t.selectionEnd,l=a.value.content,v=`![image](${n})`;a.value.content=l.substring(0,o)+v+l.substring(s),setTimeout(()=>{t.focus();const h=o+v.length;t.setSelectionRange(h,h)})},R=n=>{const t=n.target.files[0];t&&U(t),n.target.value=""},B=n=>{w.value=!0,n.dataTransfer.dropEffect="copy"},K=()=>{w.value=!1},N=n=>{w.value=!1;const t=n.dataTransfer.files[0];t&&U(t)};L(async()=>{if(p.value){x.value=!0;try{const t=(await T.get(`/article/${m.params.id}`)).data.article;a.value={title:t.title,tags:t.tags||[],abbr:t.abbr||"",content:t.content}}catch(n){console.error("获取文章失败:",n),alert("获取文章失败"),f.push("/article")}finally{x.value=!1}}});const q=I(()=>at(a.value.content)),S=()=>{const n=y.value.trim().replace(",","");n&&!a.value.tags.includes(n)&&a.value.tags.push(n),y.value=""},z=n=>{a.value.tags.splice(n,1)},H=()=>{k.value=!k.value},c=(n,t="")=>{const o=D.value,s=o.selectionStart,l=o.selectionEnd,v=a.value.content,h=v.substring(0,s),W=v.substring(s,l),G=v.substring(l);a.value.content=h+n+W+t+G,setTimeout(()=>{o.focus(),o.setSelectionRange(s+n.length,l+n.length)})},j=async()=>{try{p.value?(await T.put(`/article/${m.params.id}`,a.value),alert("文章更新成功"),f.push(`/article/${m.params.id}`)):(await T.post("/articleAdd",a.value),alert("文章发布成功"),f.push("/article"))}catch(n){console.error("操作失败:",n),alert(p.value?"更新文章失败":"发布文章失败")}},O=()=>{confirm("确定要取消编辑吗？未保存的修改将丢失")&&f.back()},V=n=>{n.preventDefault(),n.returnValue=""};return L(()=>{window.addEventListener("beforeunload",V)}),Q(()=>{window.removeEventListener("beforeunload",V)}),(n,t)=>(u(),i("div",st,[e("h2",null,b(p.value?"编辑文章":"发布文章"),1),x.value?(u(),i("div",lt,"加载中...")):(u(),i("form",{key:1,onSubmit:d(j,["prevent"]),class:"article-form"},[e("div",rt,[t[11]||(t[11]=e("label",{for:"title"},"标题",-1)),C(e("input",{type:"text",id:"title","onUpdate:modelValue":t[0]||(t[0]=o=>a.value.title=o),required:"",placeholder:"请输入文章标题"},null,512),[[_,a.value.title]])]),e("div",it,[t[12]||(t[12]=e("label",null,"标签",-1)),e("div",ut,[e("div",ct,[(u(!0),i(X,null,Y(a.value.tags,(o,s)=>(u(),i("span",{key:s,class:"tag"},[et(b(o)+" ",1),e("button",{type:"button",onClick:d(l=>z(s),["prevent"])},"× ",8,dt)]))),128))]),e("div",pt,[C(e("input",{type:"text","onUpdate:modelValue":t[1]||(t[1]=o=>y.value=o),onKeydown:[A(d(S,["prevent"]),["enter"]),A(d(S,["prevent"]),["comma"])],placeholder:"输入标签，按Enter或逗号添加",maxlength:"20"},null,40,vt),[[_,y.value]])])])]),e("div",gt,[t[13]||(t[13]=e("label",{for:"content"},"内容",-1)),e("div",bt,[e("button",{type:"button",onClick:t[2]||(t[2]=o=>c("**","**"))},"粗体"),e("button",{type:"button",onClick:t[3]||(t[3]=o=>c("*","*"))},"斜体"),e("button",{type:"button",onClick:t[4]||(t[4]=o=>c("### "))},"标题"),e("button",{type:"button",onClick:t[5]||(t[5]=o=>c("> "))},"引用"),e("button",{type:"button",onClick:t[6]||(t[6]=o=>c("- "))},"列表"),e("button",{type:"button",onClick:t[7]||(t[7]=o=>c("[]() "))},"链接"),e("button",{type:"button",onClick:t[8]||(t[8]=o=>c("```\n","\n```"))},"代码块"),e("button",{type:"button",onClick:P},"插入图片"),e("input",{type:"file",ref_key:"imageInput",ref:M,onChange:R,accept:"image/*",style:{display:"none"}},null,544)]),e("div",{class:Z(["editor-container",{"drag-over":w.value}]),onDrop:d(N,["prevent"]),onDragover:d(B,["prevent"]),onDragleave:d(K,["prevent"])},[C(e("textarea",{id:"content","onUpdate:modelValue":t[9]||(t[9]=o=>a.value.content=o),rows:"20",required:"",placeholder:"请输入文章内容（支持Markdown）",ref_key:"contentEditor",ref:D},null,512),[[_,a.value.content]]),E.value?(u(),i("div",ft,[e("div",{class:"progress-bar",style:tt({width:g.value+"%"})},null,4),e("span",null,"上传中... "+b(g.value)+"%",1)])):$("",!0)],34),k.value?(u(),i("div",{key:0,class:"markdown-preview",innerHTML:q.value},null,8,mt)):$("",!0)]),e("div",yt,[t[14]||(t[14]=e("label",{for:"abbr"},"摘要",-1)),C(e("textarea",{id:"abbr","onUpdate:modelValue":t[10]||(t[10]=o=>a.value.abbr=o),rows:"3",placeholder:"请输入文章摘要"},null,512),[[_,a.value.abbr]])]),e("div",kt,[e("button",{type:"button",onClick:H,class:"preview-btn"},b(k.value?"关闭预览":"预览"),1),e("button",wt,b(p.value?"保存修改":"发布文章"),1),p.value?(u(),i("button",{key:0,type:"button",onClick:O,class:"cancel-btn"}," 取消编辑 ")):$("",!0)])],32))]))}},xt=J(ht,[["__scopeId","data-v-a99fadb6"]]);export{xt as default};