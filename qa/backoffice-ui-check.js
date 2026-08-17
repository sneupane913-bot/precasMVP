/**
 * THE BACK OFFICE FEATURES THAT HAD NO DOOR.
 *
 * Ten server actions existed with no screen anywhere calling them, so ten
 * features the client had already paid for could not be used by any human
 * being: opening a consultancy at all, approving one, a consultancy buying
 * seats, setting their branding, topping a student back up, giving a student
 * credit by hand, blocking a farm's device, adding a question, reading the
 * audit trail, and changing the post-trial offer.
 *
 * `qa/reachable-check.js` now fails the build if an action has no caller. This
 * suite is the other half: it proves the wiring actually WORKS, end to end,
 * rather than that a string appears in a file.
 *
 * It also holds the money guard that building the seat purchase exposed. A
 * consultancy's own seat order carries their consultancy id, so the existing
 * ownership check let them approve it themselves: order twenty seats, claim to
 * have paid, approve yourself, take NPR 6,000 of stock. Found by running the
 * flow, not by reading it.
 *
 * Run:  QA_PORT=3096 node qa/backoffice-ui-check.js
 */
const http = require('http');

/**
 * The back-office passcodes, READ FROM THE ENVIRONMENT.
 *
 * These were the literals 'super-dev' and 'owner-dev'. On any machine with a
 * real `.env.local` — which is every machine that can actually run the product
 * — each back-office call came back 403 "bad credentials", and the suites
 * reported that as PRODUCT defects. `walk-check` produced twenty-three of them
 * in one run. `lifecycle-check` E8 printed "second=DOUBLE GRANTED" when nothing
 * had been granted at all, because the FIRST approval had been refused.
 *
 * A suite that reports a wrong password as a double grant is worse than no
 * suite. The next person reads twenty-three findings, discovers the first two
 * are nonsense, and stops reading — and a real one is sitting at number
 * nineteen. It is the same lesson as R-6's false positive on /refund: fix the
 * harness, never relax the rule.
 *
 * The literal stays as the fallback, because a fresh clone with no `.env.local`
 * really does run on the dev defaults.
 */
const QA_SUPER_KEY = process.env.SUPER_ADMIN_PASSCODE || 'super-dev';
const QA_OWNER_KEY = process.env.OWNER_ACCESS_KEY || process.env.OWNER_PASSCODE || 'owner-dev';

const P = Number(process.env.QA_PORT || 3096);
const SU = process.env.SUPER_ADMIN_PASSCODE || QA_SUPER_KEY;
function req(m,p,b,ip='198.51.60.5',cookie){return new Promise(r=>{const d=b?JSON.stringify(b):null;const h={'x-forwarded-for':ip};if(d)h['Content-Type']='application/json';if(cookie)h['Cookie']=cookie;const q=http.request({host:'127.0.0.1',port:P,path:p,method:m,headers:h},s=>{let x='';s.on('data',c=>x+=c);s.on('end',()=>{let j=null;try{j=JSON.parse(x)}catch{}r({code:s.statusCode,json:j,sc:s.headers['set-cookie']||[],body:x});});});q.on('error',e=>r({code:0,body:''+e}));if(d)q.write(d);q.end();});}
const jar=r=>(r.sc||[]).map(c=>c.split(';')[0]).join('; ');
let ok=0,bad=0;
const t=(n,c,d='')=>{if(c){ok++;console.log('  ok   '+n)}else{bad++;console.log('  BUG  '+n+'\n       '+d)}};
(async()=>{
 const S=Date.now().toString(36);
 console.log('\n--- consultancy channel, opened from the screen ---');
 const made=await req('POST','/api/platform',{action:'createConsultancy',superKey:SU,name:'New Hub '+S,slug:'newhub-'+S,contactName:'Sita',contactPhone:'+97798',seatsTotal:0,paidNpr:0,passcode:'handover-hub1'});
 t('super admin can create a consultancy', made.code===200, `${made.code} ${made.body.slice(0,120)}`);
 const cid=made.json?.data?.id;
 const beforeApproval=await req('POST','/api/admin',{action:'login',slug:'newhub-'+S,passcode:'handover-hub1'});
 t('and it does nothing until approved', beforeApproval.code===403, `${beforeApproval.code}`);
 const appr=await req('POST','/api/platform',{action:'setConsultancyStatus',superKey:SU,consultancyId:cid,status:'approved'});
 t('super admin can approve it', appr.code===200, `${appr.code}`);
 // The code we set them is a HANDOVER code: it opens the door once and shows
 // them nothing, because until they replace it we and they share one secret.
 const stillGated=await req('POST','/api/admin',{action:'login',slug:'newhub-'+S,passcode:'handover-hub1'});
 t('an approved consultancy still cannot read anything on our handover code', stillGated.json?.error?.code==='PASSCODE_MUST_CHANGE', `${stillGated.code} ${stillGated.json?.error?.code}`);
 const chose=await req('POST','/api/admin',{action:'changePasscode',slug:'newhub-'+S,passcode:'handover-hub1',newPasscode:'hubpass1'});
 t('they can choose their own passcode', chose.code===200, `${chose.code} ${chose.body.slice(0,120)}`);
 const login=await req('POST','/api/admin',{action:'login',slug:'newhub-'+S,passcode:'hubpass1'});
 t('the portal then opens', login.code===200, `${login.code}`);
 t('and the portal is told which bundles it can buy', (login.json?.data?.bundles??[]).length===2, JSON.stringify(login.json?.data?.bundles));

 console.log('\n--- a consultancy buys seats, end to end ---');
 const buy=await req('POST','/api/admin',{action:'buySeats',slug:'newhub-'+S,passcode:'hubpass1',bundleCode:'b20'});
 t('buying seats gives an amount and a QR', buy.json?.data?.amountNpr===6000 && 'payTo' in (buy.json?.data??{}), JSON.stringify(buy.json?.data).slice(0,140));
 const oid=buy.json?.data?.orderId;
 const sub=await req('POST','/api/admin',{action:'submitSeatPayment',slug:'newhub-'+S,passcode:'hubpass1',orderId:oid,walletTxnId:'SEAT'+S,payerName:'Sita',payerPhoneSuffix:'1234'});
 t('and they can tell us the transaction number', sub.code===200, `${sub.code} ${sub.body.slice(0,120)}`);
 const dup=await req('POST','/api/admin',{action:'submitSeatPayment',slug:'newhub-'+S,passcode:'hubpass1',orderId:oid,walletTxnId:'SEAT'+S,payerName:'Sita',payerPhoneSuffix:'1234'});
 t('sending it twice on bad wifi is calm, not red', dup.code===200, `${dup.code}`);
 const login2=await req('POST','/api/admin',{action:'login',slug:'newhub-'+S,passcode:'hubpass1'});
 // Guard the guard. This line once used a stale passcode, so the login 403d,
 // `orders` was undefined, and "the queue is empty" passed for the wrong
 // reason. An assertion that is satisfied by getting NOTHING back is not an
 // assertion, so prove we are actually logged in before believing the queue.
 t('we really are inside the portal before judging what it shows', login2.code===200 && Array.isArray(login2.json?.data?.orders), `${login2.code}`);
 t('their own seat payment is NOT in their approval queue', (login2.json?.data?.orders??[]).length===0, JSON.stringify((login2.json?.data?.orders??[]).map(o=>o.state)));
 t('it shows as their own purchase, waiting on us', login2.json?.data?.stats?.seatPaymentPending===true, JSON.stringify(login2.json?.data?.stats));
 const sneak=await req('POST','/api/admin',{action:'approvePayment',slug:'newhub-'+S,passcode:'hubpass1',orderId:oid,confirmedReceived:true});
 t('a consultancy cannot approve its OWN seat payment', sneak.code>=400, `${sneak.code} ${sneak.body.slice(0,100)}`);

 console.log('\n--- the offer the super admin can now actually change ---');
 const rr=await req('POST','/api/super',{action:'setRewardRule',superKey:SU,active:true,windowMinutes:90,publicReason:'You finished your free questions today, so extra mocks are included if you carry on now.',bonusPrep:2,bonusSerious:3});
 t('the post-trial offer can be changed', rr.code===200 && rr.json?.data?.windowMinutes===90, `${rr.code} ${rr.body.slice(0,120)}`);
 const ov=await req('POST','/api/super',{action:'overview',superKey:SU});
 t('and the form is sent what is actually in force', ov.json?.data?.rewardRule?.windowMinutes===90 && ov.json?.data?.rewardRule?.bonusSerious===3, JSON.stringify(ov.json?.data?.rewardRule));
 const silly=await req('POST','/api/super',{action:'setRewardRule',superKey:SU,active:true,windowMinutes:2,publicReason:'Hurry up now',bonusPrep:1,bonusSerious:1});
 t('a two minute countdown is refused as pressure', silly.code===400, `${silly.code}`);

 console.log('\n--- add a question, block a device, give credit ---');
 const q=await req('POST','/api/super',{action:'addQuestion',superKey:SU,category:'finances',text:'Who is paying for your studies, and how do you know they can afford it?',intent:'A named person, their real occupation, and awareness of the actual amount.'});
 t('a question can be added with no deploy', q.code===200, `${q.code}`);
 const blk=await req('POST','/api/super',{action:'setDeviceBlock',superKey:SU,fingerprint:'fp_farm_'+S,blocked:true});
 t('a device can be soft blocked', blk.code===200 && blk.json?.data?.blocked===true, `${blk.code}`);
 const st=await req('POST','/api/auth/firebase',{idToken:'dev:gc_'+S,fingerprint:'gc'+S},'198.51.60.9');
 const dir=await req('POST','/api/super',{action:'directory',superKey:SU});
 const target=(dir.json?.data?.students??[]).find(x=>x.email==='gc_'+S+'@dev.local')||(dir.json?.data?.students??[])[0];
 const gc=await req('POST','/api/super',{action:'grantCredit',superKey:SU,studentId:target.id,kind:'mock',amount:3,note:'support fix'});
 t('credit can be given by hand', gc.code===200 && gc.json?.data?.granted===3, `${gc.code}`);
 const au=await req('POST','/api/super',{action:'audit',superKey:SU});
 const acts=(au.json?.data??[]).map(a=>a.action);
 t('and every one of those is in the audit trail', ['add_question','set_device_block','grant_credit','reward_rule_change'].every(a=>acts.includes(a)), acts.slice(0,12).join(','));
 console.log(`\n  ${ok} passed, ${bad} bugs\n`);
 process.exit(bad > 0 ? 1 : 0);
})();
