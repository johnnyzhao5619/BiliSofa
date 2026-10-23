// Synthetic ADR-101 native bridge: no socket or TV media claim. It insists on each track's Bilibili backup
// and the start bits, and reports one move to the backup only when a session starts on the failing primary
// (0.50.3 marks a later start with start bits; 0.50.4 puts the backup first instead).
(function(){const m=Module;let active=false;const line=/^https:\/\/(upos-hz-mirrorakam\.akamaized\.net|upos-sz-mirrorcosov\.bilivideo\.com)\/v[0-9a-z]+\.m4s\?deadline=[0-9]{10}$/,backup=line,akam=/mirrorakam/;Object.assign(m,{
 callMain(args){if(args[0]==='renew'){if(!active||args.length!==6||!backup.test(args[4])||!backup.test(args[5]))throw Error('renew without failover arguments');m.print('VOD:renewed');return;}
 if(active||args[0]!=='bridge'||args.length!==9||!backup.test(args[6])||!backup.test(args[7])||!/^[0-3]$/.test(args[8]))throw Error('bridge without failover arguments');active=true;m.print('BRIDGE:ready');
 for(const line of ['BRIDGE:request:get_range','BRIDGE:served:0'])m.print(line);
 if(args[8]==='0'&&!akam.test(args[3]))setTimeout(()=>m.print('BRIDGE:failover:1'),50);},
 _bridge_stop(){active=false;m.print('BRIDGE:stopped');}
});setTimeout(()=>m.onRuntimeInitialized(),0);})();
