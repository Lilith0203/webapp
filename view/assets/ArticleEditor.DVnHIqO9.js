import{_ as J,c as R,r,o as A,a as Q,b as i,d as n,t as m,w as d,e as T,v as _,F as X,f as Y,g as P,n as Z,h as tt,i as $,j as x,k as u,l as et,u as nt,m as ot,p as at}from"./index.CbHZZiq1.js";const st={class:"publish-article"},lt={key:0,class:"loading"},rt={class:"form-group"},it={class:"form-group"},ut={class:"tags-input"},ct={class:"tags-container"},dt=["onClick"],pt={class:"tag-input-wrapper"},vt=["onKeydown"],gt={class:"form-group"},bt={class:"editor-toolbar"},mt={key:0,class:"upload-progress"},ft=["innerHTML"],yt={class:"form-group"},kt={class:"form-actions"},wt={type:"submit",class:"publish-btn"},ht={__name:"ArticleEditor",setup(Ct){const f=nt(),y=ot(),p=R(()=>!!y.params.id),E=r(!1),k=r(""),w=r(!1),D=r(null),M=r(null),h=r(!1),S=r(!1),b=r(0),a=r({title:"",tags:[],abbr:"",content:""}),F=()=>{M.value.click()},U=async e=>{if(!e||!e.type.startsWith("image/")){alert("请选择图片文件");return}S.value=!0,b.value=0;try{const t=new FormData;t.append("file",e),t.append("folder","article");const s=(await x.post("/upload",t,{headers:{"Content-Type":"multipart/form-data"},onUploadProgress:l=>{b.value=Math.round(l.loaded*100/l.total)}})).data.url;K(s)}catch(t){console.error("上传失败:",t),alert("图片上传失败")}finally{S.value=!1,b.value=0}},K=e=>{const t=D.value,o=t.selectionStart,s=t.selectionEnd,l=a.value.content,v=new URL(e);["Expires","OSSAccessKeyId","Signature","security-token","x-oss-process"].forEach(g=>v.searchParams.delete(g)),e=v.toString();const C=`![image](${e})`;a.value.content=l.substring(0,o)+C+l.substring(s),setTimeout(()=>{t.focus();const g=o+C.length;t.setSelectionRange(g,g)})},B=e=>{const t=e.target.files[0];t&&U(t),e.target.value=""},N=e=>{h.value=!0,e.dataTransfer.dropEffect="copy"},O=()=>{h.value=!1},j=e=>{h.value=!1;const t=e.dataTransfer.files[0];t&&U(t)};A(async()=>{if(p.value){E.value=!0;try{const t=(await x.get(`/article/${y.params.id}`)).data.article;a.value={title:t.title,tags:t.tags||[],abbr:t.abbr||"",content:t.content}}catch(e){console.error("获取文章失败:",e),alert("获取文章失败"),f.push("/article")}finally{E.value=!1}}});const q=R(()=>at(a.value.content)),I=()=>{const e=k.value.trim().replace(",","");e&&!a.value.tags.includes(e)&&a.value.tags.push(e),k.value=""},z=e=>{a.value.tags.splice(e,1)},H=()=>{w.value=!w.value},c=(e,t="")=>{const o=D.value,s=o.selectionStart,l=o.selectionEnd,v=a.value.content,L=v.substring(0,s),C=v.substring(s,l),g=v.substring(l);a.value.content=L+e+C+t+g,setTimeout(()=>{o.focus(),o.setSelectionRange(s+e.length,l+e.length)})},W=async()=>{try{p.value?(a.value.id=y.params.id,await x.post("/article/edit",a.value),f.push(`/article/${y.params.id}`)):(await x.post("/articleAdd",a.value),f.push("/article"))}catch(e){console.error("操作失败:",e),alert(p.value?"更新文章失败":"发布文章失败")}},G=()=>{confirm("确定要取消编辑吗？未保存的修改将丢失")&&f.back()},V=e=>{e.preventDefault(),e.returnValue=""};return A(()=>{window.addEventListener("beforeunload",V)}),Q(()=>{window.removeEventListener("beforeunload",V)}),(e,t)=>(u(),i("div",st,[n("h2",null,m(p.value?"编辑文章":"发布文章"),1),E.value?(u(),i("div",lt,"加载中...")):(u(),i("form",{key:1,onSubmit:d(W,["prevent"]),class:"article-form"},[n("div",rt,[t[11]||(t[11]=n("label",{for:"title"},"标题",-1)),T(n("input",{type:"text",id:"title","onUpdate:modelValue":t[0]||(t[0]=o=>a.value.title=o),required:"",placeholder:"请输入文章标题"},null,512),[[_,a.value.title]])]),n("div",it,[t[12]||(t[12]=n("label",null,"标签",-1)),n("div",ut,[n("div",ct,[(u(!0),i(X,null,Y(a.value.tags,(o,s)=>(u(),i("span",{key:s,class:"tag"},[et(m(o)+" ",1),n("button",{type:"button",onClick:d(l=>z(s),["prevent"])},"× ",8,dt)]))),128))]),n("div",pt,[T(n("input",{type:"text","onUpdate:modelValue":t[1]||(t[1]=o=>k.value=o),onKeydown:[P(d(I,["prevent"]),["enter"]),P(d(I,["prevent"]),["comma"])],placeholder:"输入标签，按Enter或逗号添加",maxlength:"20"},null,40,vt),[[_,k.value]])])])]),n("div",gt,[t[13]||(t[13]=n("label",{for:"content"},"内容",-1)),n("div",bt,[n("button",{type:"button",onClick:t[2]||(t[2]=o=>c("**","**"))},"粗体"),n("button",{type:"button",onClick:t[3]||(t[3]=o=>c("*","*"))},"斜体"),n("button",{type:"button",onClick:t[4]||(t[4]=o=>c("### "))},"标题"),n("button",{type:"button",onClick:t[5]||(t[5]=o=>c("> "))},"引用"),n("button",{type:"button",onClick:t[6]||(t[6]=o=>c("- "))},"列表"),n("button",{type:"button",onClick:t[7]||(t[7]=o=>c("[]() "))},"链接"),n("button",{type:"button",onClick:t[8]||(t[8]=o=>c("```\n","\n```"))},"代码块"),n("button",{type:"button",onClick:F},"插入图片"),n("input",{type:"file",ref_key:"imageInput",ref:M,onChange:B,accept:"image/*",style:{display:"none"}},null,544)]),n("div",{class:Z(["editor-container",{"drag-over":h.value}]),onDrop:d(j,["prevent"]),onDragover:d(N,["prevent"]),onDragleave:d(O,["prevent"])},[T(n("textarea",{id:"content","onUpdate:modelValue":t[9]||(t[9]=o=>a.value.content=o),rows:"20",required:"",placeholder:"请输入文章内容（支持Markdown）",ref_key:"contentEditor",ref:D},null,512),[[_,a.value.content]]),S.value?(u(),i("div",mt,[n("div",{class:"progress-bar",style:tt({width:b.value+"%"})},null,4),n("span",null,"上传中... "+m(b.value)+"%",1)])):$("",!0)],34),w.value?(u(),i("div",{key:0,class:"markdown-preview",innerHTML:q.value},null,8,ft)):$("",!0)]),n("div",yt,[t[14]||(t[14]=n("label",{for:"abbr"},"摘要",-1)),T(n("textarea",{id:"abbr","onUpdate:modelValue":t[10]||(t[10]=o=>a.value.abbr=o),rows:"3",placeholder:"请输入文章摘要"},null,512),[[_,a.value.abbr]])]),n("div",kt,[n("button",{type:"button",onClick:H,class:"preview-btn"},m(w.value?"关闭预览":"预览"),1),n("button",wt,m(p.value?"保存修改":"发布文章"),1),p.value?(u(),i("button",{key:0,type:"button",onClick:G,class:"cancel-btn"}," 取消编辑 ")):$("",!0)])],32))]))}},xt=J(ht,[["__scopeId","data-v-4aefe961"]]);export{xt as default};