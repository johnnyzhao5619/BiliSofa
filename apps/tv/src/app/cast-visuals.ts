/** DOM-only receiver identity and connection instructions. */
export function castInstructions():HTMLElement{
  const steps=document.createElement('ol');steps.className='tv-cast-steps';
  for(const [title,body] of [['连接同一网络','让手机和电视连接同一 Wi-Fi。'],['在手机打开视频','在官方哔哩哔哩 App 的视频内选择 TV。'],['选择 BiliSofa','选择此接收器，电视就会准备播放。']]){const item=document.createElement('li'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=title!;p.textContent=body!;item.append(h,p);steps.append(item);}return steps;
}
export function castIdentity():HTMLElement{
  const identity=document.createElement('div');identity.className='tv-cast-identity';
  const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 160 120');icon.setAttribute('aria-hidden','true');const path=document.createElementNS(icon.namespaceURI,'path');path.setAttribute('d','M12 60V12h136v96H88M12 78a30 30 0 0 1 30 30M12 58a50 50 0 0 1 50 50M12 102v6h6');icon.append(path);
  const title=document.createElement('h2');title.textContent='BiliSofa';identity.append(icon,title);return identity;
}
