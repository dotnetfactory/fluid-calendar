export default function Stub(props: {
  params: Promise<{ slug: string }>;
}) {
  void props;
  return null;
}
