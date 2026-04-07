export default function Stub(props: {
  params: Promise<{ username: string; slug: string }>;
}) {
  void props;
  return null;
}
