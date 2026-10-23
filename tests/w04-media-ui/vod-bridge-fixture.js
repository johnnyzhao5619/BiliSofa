// Synthetic native listener ACK; no decoder, socket or TV media claim.
(function(){const m=Module;let active=false;Object.assign(m,{
 callMain(args){if(args[0]==='renew'){if(!active)throw Error('renew without bridge');m.print('VOD:renewed');return;}
 if(active||args[0]!=='bridge')throw Error('synthetic bridge overlap');active=true;m.print('BRIDGE:ready');
 for(const line of ['BRIDGE:request:head','BRIDGE:request:get_range','BRIDGE:pump:burst','BRIDGE:read_mib:4','BRIDGE:served:0'])m.print(line);},
 _bridge_stop(){active=false;m.print('BRIDGE:stopped');}
});setTimeout(()=>m.onRuntimeInitialized(),0);})();
