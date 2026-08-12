import { RecoveryScreen, WRONG_DEVICE, CLEARED_DATA } from '@/components/RecoveryScreen';

/**
 * K11. An old or unopenable `/results/{id}` link used to fall through to the
 * site-wide 404, which says "we could not find that page". For a results link
 * that sentence is not merely unhelpful, it is misleading, because the most
 * common reason a student lands here is not a broken link at all: they opened
 * their own report on a second device. The report is bound to the anonymous
 * owner cookie (LIVE-002), so from the new browser it correctly looks absent,
 * while it sits perfectly intact on the phone they practised on.
 */
export default function ResultsNotFound() {
  return (
    <RecoveryScreen
      title="We cannot open this report here"
      lead="Nothing has been lost and nothing you paid for has been taken. A report can usually only be opened on the same phone or computer you practised on."
      reasons={[
        WRONG_DEVICE,
        CLEARED_DATA,
        [
          'The interview was never finished.',
          'A report is only made once an interview is completed.',
        ],
      ]}
      primary={{ href: '/universities', label: 'Practise again' }}
      footnote="If you paid and still cannot find your report, message us with your payment reference and we will sort it out."
    />
  );
}
