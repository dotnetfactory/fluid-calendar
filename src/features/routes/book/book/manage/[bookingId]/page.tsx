export default function Stub(props: {
  params: Promise<{ bookingId: string }>;
}) {
  void props;
  return null;
}
