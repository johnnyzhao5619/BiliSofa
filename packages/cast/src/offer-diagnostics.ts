import { serviceString } from '../../contracts/src/service-configuration.ts';
import type { OfferContext, OfferReason } from '../../contracts/src/cast-offer-diagnostics.ts';
import type { SoapRequest } from '../../contracts/src/upnp.ts';
import type { ReceiverDecision } from './receiver.ts';
import { inspectSoapProbeCandidate, isBiliCastAkamOffer } from './soap.ts';

// Explain the existing decision after dispatch; never changes acceptance policy.
export function receiverOfferReason(request: SoapRequest, decision: ReceiverDecision, context: OfferContext, now: number): OfferReason {
  if (request.kind !== 'offer' || !('reply' in decision)) return 'rejected_other';
  if (decision.reply.status === 200 && isBiliCastAkamOffer(request)) return 'accepted_bili_akam';
  if (decision.transition) return 'transition_accepted';
  if (decision.reply.status === 200) return 'same_source';
  if (decision.denied === 'source_changed') {
    if (!context.session) return 'single_source';
    try {
      if (!request.uri.length) return 'policy_empty';
      const policy = inspectSoapProbeCandidate(request, now);
      if (policy === 'destination') {
        const url = new URL(request.uri);
        if (!url.username && !url.password && !url.port) {
          if (new RegExp(serviceString('a_0d04b3e3e19d'), "").test(url.hostname)) return 'policy_destination_cn';
          if (new RegExp(serviceString('a_d480c935d845'), "").test(url.hostname)) return 'policy_destination_akamaized';
        }
      }
      if (policy === 'other_format' && new URL(request.uri).pathname.endsWith('.flv')) return 'policy_other_flv';
      if (policy === 'deadline_unusable') {
        const expiry = Number(new URL(request.uri).searchParams.get('deadline')) * 1000;
        return expiry < now + 60000 ? 'policy_deadline_near' : 'policy_deadline_far';
      }
      if (policy && !['supported','http','missing','ambiguous'].includes(policy)) return ('policy_' + policy) as OfferReason;
    } catch { /* No raw error or request text enters diagnostics. */ }
    return 'policy_validation_other';
  }
  return decision.stale ?? (decision.denied && ['owner','locked','busy','limit'].includes(decision.denied) ? decision.denied as OfferReason : 'rejected_other');
}
