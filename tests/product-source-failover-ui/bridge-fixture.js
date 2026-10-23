// Synthetic ADR-102 native bridge: no socket or TV media claim. A session must start on the line whose
// source check passed (the Akamai backup), keep the failed primary as its alternate, and use no start bits.
(function(){const m=Module;let active=false;const akam=/^https:\/\/upos-hz-mirrorakam\.akamaized\.net\/v[0-9]+\.m4s\?deadline=[0-9]{10}$/,cosov=/^https:\/\/upos-sz-mirrorcosov\.bilivideo\.com\/v[0-9]+\.m4s\?deadline=[0-9]{10}$/;Object.assign(m,{
 callMain(args){if(args[0]==='renew'){if(!active||args.length!==6||!akam.test(args[1])||!akam.test(args[2])||!cosov.test(args[4])||!cosov.test(args[5]))throw Error('renewal left the checked line');m.print('VOD:renewed');return;}
 if(active||args[0]!=='bridge'||args.length!==9||!akam.test(args[3])||!akam.test(args[4])||!cosov.test(args[6])||!cosov.test(args[7])||args[8]!=='0')throw Error('bridge did not start on the checked backup');active=true;m.print('BRIDGE:ready');
 for(const line of ['BRIDGE:request:get_range','BRIDGE:served:0'])m.print(line);},
 _bridge_stop(){active=false;m.print('BRIDGE:stopped');}
});setTimeout(()=>m.onRuntimeInitialized(),0);})();
