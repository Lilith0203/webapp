import{_ as Q,c as R,r,o as A,a as X,b as i,d as o,t as m,w as d,e as C,v as _,F as Y,f as Z,g as P,n as tt,h as et,i as $,j as x,k as ot,l as u,m as nt,u as at,p as st,q as lt,s as rt}from"./index.BosFKpa2.js";const it={class:"publish-article"},ut={key:0,class:"loading"},ct={class:"form-group"},dt={class:"form-group"},pt={class:"tags-input"},vt={class:"tags-container"},gt=["onClick"],bt={class:"tag-input-wrapper"},mt=["onKeydown"],ft={class:"form-group"},yt={class:"editor-toolbar"},wt={key:0,class:"upload-progress"},kt=["innerHTML"],ht={class:"form-group"},Tt={class:"form-actions"},Ct={type:"submit",class:"publish-btn"},_t={__name:"ArticleEditor",setup(xt){const f=at(),y=st(),p=R(()=>!!y.params.id),E=r(!1),w=r(""),k=r(!1),D=r(null),M=r(null),h=r(!1),S=r(!1),b=r(0),a=r({title:"",tags:[],abbr:"",content:""}),F=()=>{M.value.click()},U=async e=>{if(!e||!e.type.startsWith("image/")){lt.alert("请选择图片文件");return}S.value=!0,b.value=0;try{const t=new FormData;t.append("file",e),t.append("folder","article");const s=(await x.post("/upload",t,{headers:{"Content-Type":"multipart/form-data"},onUploadProgress:l=>{b.value=Math.round(l.loaded*100/l.total)}})).data.url;K(s)}catch(t){console.error("上传失败:",t),alert("图片上传失败")}finally{S.value=!1,b.value=0}},K=e=>{const t=D.value,n=t.selectionStart,s=t.selectionEnd,l=a.value.content,v=new URL(e);["Expires","OSSAccessKeyId","Signature","security-token","x-oss-process"].forEach(g=>v.searchParams.delete(g)),e=v.toString();const T=`![image](${e})`;a.value.content=l.substring(0,n)+T+l.substring(s),setTimeout(()=>{t.focus();const g=n+T.length;t.setSelectionRange(g,g)})},q=e=>{const t=e.target.files[0];t&&U(t),e.target.value=""},B=e=>{h.value=!0,e.dataTransfer.dropEffect="copy"},N=()=>{h.value=!1},O=e=>{h.value=!1;const t=e.dataTransfer.files[0];t&&U(t)};A(async()=>{if(p.value){E.value=!0;try{const t=(await x.get(`/article/${y.params.id}`)).data.article;a.value={title:t.title,tags:t.tags||[],abbr:t.abbr||"",content:t.content}}catch(e){console.error("获取文章失败:",e),alert("获取文章失败"),f.push("/article")}finally{E.value=!1}}});const j=R(()=>rt(a.value.content)),I=()=>{const e=w.value.trim().replace(",","");e&&!a.value.tags.includes(e)&&a.value.tags.push(e),w.value=""},z=e=>{a.value.tags.splice(e,1)},H=()=>{k.value=!k.value},c=(e,t="")=>{const n=D.value,s=n.selectionStart,l=n.selectionEnd,v=a.value.content,L=v.substring(0,s),T=v.substring(s,l),g=v.substring(l),J=n.scrollTop;a.value.content=L+e+T+t+g,setTimeout(()=>{n.focus(),n.setSelectionRange(s+e.length,l+e.length),n.scrollTop=J})},W=async()=>{try{p.value?(a.value.id=y.params.id,await x.post("/article/edit",a.value),f.push(`/article/${y.params.id}`)):(await x.post("/articleAdd",a.value),f.push("/article"))}catch(e){console.error("操作失败:",e),alert(p.value?"更新文章失败":"发布文章失败")}},G=async()=>{await ot("确定要取消编辑吗？未保存的修改将丢失")&&f.back()},V=e=>{e.preventDefault(),e.returnValue=""};return A(()=>{window.addEventListener("beforeunload",V)}),X(()=>{window.removeEventListener("beforeunload",V)}),(e,t)=>(u(),i("div",it,[o("h2",null,m(p.value?"编辑文章":"发布文章"),1),E.value?(u(),i("div",ut,"加载中...")):(u(),i("form",{key:1,onSubmit:d(W,["prevent"]),class:"article-form"},[o("div",ct,[t[11]||(t[11]=o("label",{for:"title"},"标题",-1)),C(o("input",{type:"text",id:"title","onUpdate:modelValue":t[0]||(t[0]=n=>a.value.title=n),required:"",placeholder:"请输入文章标题"},null,512),[[_,a.value.title]])]),o("div",dt,[t[12]||(t[12]=o("label",null,"标签",-1)),o("div",pt,[o("div",vt,[(u(!0),i(Y,null,Z(a.value.tags,(n,s)=>(u(),i("span",{key:s,class:"tag"},[nt(m(n)+" ",1),o("button",{type:"button",onClick:d(l=>z(s),["prevent"])},"× ",8,gt)]))),128))]),o("div",bt,[C(o("input",{type:"text","onUpdate:modelValue":t[1]||(t[1]=n=>w.value=n),onKeydown:[P(d(I,["prevent"]),["enter"]),P(d(I,["prevent"]),["comma"])],placeholder:"输入标签，按Enter或逗号添加",maxlength:"20"},null,40,mt),[[_,w.value]])])])]),o("div",ft,[t[13]||(t[13]=o("label",{for:"content"},"内容",-1)),o("div",yt,[o("button",{type:"button",onClick:t[2]||(t[2]=n=>c("**","**"))},"粗体"),o("button",{type:"button",onClick:t[3]||(t[3]=n=>c("*","*"))},"斜体"),o("button",{type:"button",onClick:t[4]||(t[4]=n=>c("### "))},"标题"),o("button",{type:"button",onClick:t[5]||(t[5]=n=>c("> "))},"引用"),o("button",{type:"button",onClick:t[6]||(t[6]=n=>c("- "))},"列表"),o("button",{type:"button",onClick:t[7]||(t[7]=n=>c("[]() "))},"链接"),o("button",{type:"button",onClick:t[8]||(t[8]=n=>c("```\n","\n```"))},"代码块"),o("button",{type:"button",onClick:F},"插入图片"),o("input",{type:"file",ref_key:"imageInput",ref:M,onChange:q,accept:"image/*",style:{display:"none"}},null,544)]),o("div",{class:tt(["editor-container",{"drag-over":h.value}]),onDrop:d(O,["prevent"]),onDragover:d(B,["prevent"]),onDragleave:d(N,["prevent"])},[C(o("textarea",{id:"content","onUpdate:modelValue":t[9]||(t[9]=n=>a.value.content=n),rows:"20",required:"",placeholder:"请输入文章内容（支持Markdown）",ref_key:"contentEditor",ref:D},null,512),[[_,a.value.content]]),S.value?(u(),i("div",wt,[o("div",{class:"progress-bar",style:et({width:b.value+"%"})},null,4),o("span",null,"上传中... "+m(b.value)+"%",1)])):$("",!0)],34),k.value?(u(),i("div",{key:0,class:"markdown-preview",innerHTML:j.value},null,8,kt)):$("",!0)]),o("div",ht,[t[14]||(t[14]=o("label",{for:"abbr"},"摘要",-1)),C(o("textarea",{id:"abbr","onUpdate:modelValue":t[10]||(t[10]=n=>a.value.abbr=n),rows:"3",placeholder:"请输入文章摘要"},null,512),[[_,a.value.abbr]])]),o("div",Tt,[o("button",{type:"button",onClick:H,class:"preview-btn"},m(k.value?"关闭预览":"预览"),1),o("button",Ct,m(p.value?"保存修改":"发布文章"),1),p.value?(u(),i("button",{key:0,type:"button",onClick:G,class:"cancel-btn"}," 取消编辑 ")):$("",!0)])],32))]))}},St=Q(_t,[["__scopeId","data-v-43ba3529"]]);export{St as default};